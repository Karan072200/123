from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import io
import csv
import uuid
import secrets
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# Emergent LLM
from emergentintegrations.llm.chat import LlmChat, UserMessage

# ----- Config -----
JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ["JWT_SECRET"]
EMERGENT_LLM_KEY = os.environ["EMERGENT_LLM_KEY"]

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="PaisaBook API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("paisabook")


# ----- Auth Helpers -----
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def gen_invite_code() -> str:
    # Human-friendly 6-char code
    alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(alphabet) for _ in range(6))


async def ensure_personal_ledger(user_doc: dict) -> str:
    """Ensure user has a personal ledger + backfill legacy docs. Returns ledger id."""
    uid = user_doc["id"]
    personal_id = user_doc.get("personal_ledger_id")
    if not personal_id:
        personal_id = f"pl_{uid}"
        await db.ledgers.update_one(
            {"id": personal_id},
            {
                "$setOnInsert": {
                    "id": personal_id,
                    "name": "Personal",
                    "type": "personal",
                    "owner_user_id": uid,
                    "members": [uid],
                    "invite_code": None,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
            },
            upsert=True,
        )
        await db.users.update_one(
            {"id": uid},
            {"$set": {
                "personal_ledger_id": personal_id,
                "current_ledger_id": user_doc.get("current_ledger_id") or personal_id,
            }},
        )
        # backfill: legacy docs with no owner_id get user's personal_ledger_id
        for coll in ("accounts", "transactions", "udhaar", "recurring", "budgets"):
            await db[coll].update_many(
                {"user_id": uid, "owner_id": {"$exists": False}},
                {"$set": {"owner_id": personal_id}},
            )
    return personal_id


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await db.users.find_one({"id": payload["sub"]}, {"password_hash": 0, "_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    await ensure_personal_ledger(user)
    # reload after backfill to pick up new fields
    user = await db.users.find_one({"id": payload["sub"]}, {"password_hash": 0, "_id": 0})

    # verify user is still a member of their current_ledger_id; else fall back to personal
    cur_id = user.get("current_ledger_id") or user["personal_ledger_id"]
    lg = await db.ledgers.find_one({"id": cur_id, "members": user["id"]}, {"_id": 0})
    if not lg:
        cur_id = user["personal_ledger_id"]
        await db.users.update_one({"id": user["id"]}, {"$set": {"current_ledger_id": cur_id}})
        lg = await db.ledgers.find_one({"id": cur_id}, {"_id": 0})
    user["current_ledger_id"] = cur_id
    user["current_ledger"] = lg
    return user


def scope(user: dict) -> dict:
    """MongoDB filter to scope by user's active ledger."""
    return {"owner_id": user["current_ledger_id"]}


# ----- Models -----
class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str
    currency: str = "INR"


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class AccountIn(BaseModel):
    name: str
    type: Literal["savings", "current", "cash", "wallet", "credit_card", "other"] = "savings"
    opening_balance: float = 0.0
    currency: str = "INR"
    color: str = "#2A4F4F"


class TransactionIn(BaseModel):
    account_id: str
    type: Literal["income", "expense"]
    amount: float
    category: str
    note: Optional[str] = ""
    date: Optional[str] = None


class TransactionUpdate(BaseModel):
    account_id: Optional[str] = None
    type: Optional[Literal["income", "expense"]] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    note: Optional[str] = None
    date: Optional[str] = None


class UdhaarIn(BaseModel):
    person_name: str
    phone: Optional[str] = ""
    type: Literal["lene", "dene"]
    amount: float
    note: Optional[str] = ""
    due_date: Optional[str] = None


class UdhaarUpdate(BaseModel):
    person_name: Optional[str] = None
    phone: Optional[str] = None
    amount: Optional[float] = None
    note: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[Literal["pending", "settled"]] = None


class RecurringIn(BaseModel):
    account_id: str
    type: Literal["income", "expense"]
    amount: float
    category: str
    note: Optional[str] = ""
    frequency: Literal["daily", "weekly", "monthly"] = "monthly"
    day_of_month: Optional[int] = None
    start_date: Optional[str] = None
    active: bool = True


class BudgetIn(BaseModel):
    category: str
    amount: float


class LedgerCreate(BaseModel):
    name: str


class LedgerJoin(BaseModel):
    invite_code: str


# ----- Auth Endpoints -----
@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    uid = str(uuid.uuid4())
    personal_id = f"pl_{uid}"
    now = datetime.now(timezone.utc).isoformat()
    await db.users.insert_one({
        "id": uid,
        "email": email,
        "name": body.name,
        "password_hash": hash_password(body.password),
        "currency": body.currency,
        "personal_ledger_id": personal_id,
        "current_ledger_id": personal_id,
        "created_at": now,
    })
    await db.ledgers.insert_one({
        "id": personal_id,
        "name": "Personal",
        "type": "personal",
        "owner_user_id": uid,
        "members": [uid],
        "invite_code": None,
        "created_at": now,
    })
    token = create_access_token(uid, email)
    response.set_cookie("access_token", token, httponly=True, secure=False, samesite="lax",
                        max_age=60 * 60 * 24 * 7, path="/")
    return {"id": uid, "email": email, "name": body.name, "currency": body.currency, "token": token}


@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], email)
    response.set_cookie("access_token", token, httponly=True, secure=False, samesite="lax",
                        max_age=60 * 60 * 24 * 7, path="/")
    return {"id": user["id"], "email": email, "name": user["name"],
            "currency": user.get("currency", "INR"), "token": token}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return {
        "id": user["id"], "email": user["email"], "name": user["name"],
        "currency": user.get("currency", "INR"),
        "personal_ledger_id": user["personal_ledger_id"],
        "current_ledger_id": user["current_ledger_id"],
        "current_ledger": user["current_ledger"],
    }


@api.patch("/auth/currency")
async def update_currency(payload: dict, user=Depends(get_current_user)):
    currency = payload.get("currency", "INR")
    await db.users.update_one({"id": user["id"]}, {"$set": {"currency": currency}})
    return {"ok": True, "currency": currency}


# ----- Ledgers (Family / Shared) -----
async def _decorate_ledger(lg: dict, user_id: str) -> dict:
    """Attach member details to a ledger doc."""
    members = await db.users.find(
        {"id": {"$in": lg.get("members", [])}}, {"_id": 0, "id": 1, "name": 1, "email": 1}
    ).to_list(20)
    lg["members_detail"] = members
    lg["is_owner"] = lg.get("owner_user_id") == user_id
    return lg


@api.get("/ledgers")
async def list_ledgers(user=Depends(get_current_user)):
    rows = await db.ledgers.find({"members": user["id"]}, {"_id": 0}).to_list(50)
    for r in rows:
        await _decorate_ledger(r, user["id"])
    return rows


@api.post("/ledgers")
async def create_ledger(body: LedgerCreate, user=Depends(get_current_user)):
    lid = str(uuid.uuid4())
    code = gen_invite_code()
    doc = {
        "id": lid,
        "name": body.name.strip() or "Shared",
        "type": "shared",
        "owner_user_id": user["id"],
        "members": [user["id"]],
        "invite_code": code,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.ledgers.insert_one(doc)
    doc.pop("_id", None)
    await _decorate_ledger(doc, user["id"])
    return doc


@api.post("/ledgers/join")
async def join_ledger(body: LedgerJoin, user=Depends(get_current_user)):
    code = body.invite_code.strip().upper()
    lg = await db.ledgers.find_one({"invite_code": code}, {"_id": 0})
    if not lg:
        raise HTTPException(status_code=404, detail="Invalid invite code")
    if user["id"] in lg.get("members", []):
        return await _decorate_ledger(lg, user["id"])
    await db.ledgers.update_one({"id": lg["id"]}, {"$addToSet": {"members": user["id"]}})
    lg["members"] = list(set(lg.get("members", []) + [user["id"]]))
    await _decorate_ledger(lg, user["id"])
    return lg


@api.post("/ledgers/{ledger_id}/switch")
async def switch_ledger(ledger_id: str, user=Depends(get_current_user)):
    lg = await db.ledgers.find_one({"id": ledger_id, "members": user["id"]}, {"_id": 0})
    if not lg:
        raise HTTPException(status_code=404, detail="Ledger not found")
    await db.users.update_one({"id": user["id"]}, {"$set": {"current_ledger_id": ledger_id}})
    return {"ok": True, "current_ledger_id": ledger_id}


@api.post("/ledgers/{ledger_id}/leave")
async def leave_ledger(ledger_id: str, user=Depends(get_current_user)):
    lg = await db.ledgers.find_one({"id": ledger_id, "members": user["id"]})
    if not lg:
        raise HTTPException(status_code=404, detail="Ledger not found")
    if lg.get("type") == "personal":
        raise HTTPException(status_code=400, detail="Cannot leave personal ledger")
    if lg.get("owner_user_id") == user["id"] and len(lg.get("members", [])) > 1:
        raise HTTPException(status_code=400, detail="Transfer ownership first")
    await db.ledgers.update_one({"id": ledger_id}, {"$pull": {"members": user["id"]}})
    # if empty & owner left, delete ledger + its data
    remaining = await db.ledgers.find_one({"id": ledger_id})
    if not remaining.get("members"):
        for coll in ("accounts", "transactions", "udhaar", "recurring", "budgets"):
            await db[coll].delete_many({"owner_id": ledger_id})
        await db.ledgers.delete_one({"id": ledger_id})
    # switch to personal
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"current_ledger_id": user["personal_ledger_id"]}},
    )
    return {"ok": True}


# ----- Accounts -----
@api.get("/accounts")
async def list_accounts(user=Depends(get_current_user)):
    accs = await db.accounts.find(scope(user), {"_id": 0}).to_list(500)
    for a in accs:
        pipeline = [
            {"$match": {"owner_id": user["current_ledger_id"], "account_id": a["id"]}},
            {"$group": {"_id": "$type", "total": {"$sum": "$amount"}}},
        ]
        agg = await db.transactions.aggregate(pipeline).to_list(10)
        income = sum(x["total"] for x in agg if x["_id"] == "income")
        expense = sum(x["total"] for x in agg if x["_id"] == "expense")
        a["balance"] = round(a.get("opening_balance", 0.0) + income - expense, 2)
    return accs


@api.post("/accounts")
async def create_account(body: AccountIn, user=Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "owner_id": user["current_ledger_id"],
        "name": body.name,
        "type": body.type,
        "opening_balance": body.opening_balance,
        "currency": body.currency,
        "color": body.color,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.accounts.insert_one(doc)
    doc.pop("_id", None)
    doc["balance"] = doc["opening_balance"]
    return doc


@api.delete("/accounts/{account_id}")
async def delete_account(account_id: str, user=Depends(get_current_user)):
    await db.accounts.delete_one({"id": account_id, "owner_id": user["current_ledger_id"]})
    await db.transactions.delete_many({"account_id": account_id, "owner_id": user["current_ledger_id"]})
    return {"ok": True}


# ----- Budget helper -----
async def compute_budget_alerts(user: dict, category: str) -> list:
    """Return list of alerts if the given category budget is >=80% or exceeded."""
    b = await db.budgets.find_one({"owner_id": user["current_ledger_id"], "category": category})
    if not b:
        return []
    now = datetime.now(timezone.utc)
    prefix = now.strftime("%Y-%m")
    pipeline = [
        {"$match": {"owner_id": user["current_ledger_id"], "type": "expense", "category": category}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]
    # naive: scan the month
    rows = await db.transactions.find(
        {"owner_id": user["current_ledger_id"], "type": "expense", "category": category},
        {"_id": 0, "amount": 1, "date": 1},
    ).to_list(5000)
    spent = sum(r["amount"] for r in rows if r.get("date", "").startswith(prefix))
    percent = (spent / b["amount"] * 100) if b["amount"] > 0 else 0
    if percent < 80:
        return []
    level = "over" if percent >= 100 else "warning"
    return [{
        "category": category,
        "budget": b["amount"],
        "spent": round(spent, 2),
        "percent": round(percent, 1),
        "level": level,
    }]


# ----- Transactions -----
@api.get("/transactions")
async def list_transactions(user=Depends(get_current_user), limit: int = 500):
    rows = await db.transactions.find(scope(user), {"_id": 0}) \
        .sort("date", -1).to_list(limit)
    # attach creator name for shared ledgers
    if user["current_ledger"].get("type") == "shared":
        uids = list({r.get("user_id") for r in rows if r.get("user_id")})
        umap = {}
        if uids:
            people = await db.users.find({"id": {"$in": uids}}, {"_id": 0, "id": 1, "name": 1}).to_list(50)
            umap = {u["id"]: u["name"] for u in people}
        for r in rows:
            r["created_by"] = umap.get(r.get("user_id"), "")
    return rows


@api.post("/transactions")
async def create_transaction(body: TransactionIn, user=Depends(get_current_user)):
    acc = await db.accounts.find_one({"id": body.account_id, "owner_id": user["current_ledger_id"]})
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "owner_id": user["current_ledger_id"],
        "account_id": body.account_id,
        "account_name": acc["name"],
        "type": body.type,
        "amount": float(body.amount),
        "category": body.category,
        "note": body.note or "",
        "date": body.date or datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.transactions.insert_one(doc)
    doc.pop("_id", None)

    alerts = []
    if body.type == "expense":
        alerts = await compute_budget_alerts(user, body.category)
    return {"transaction": doc, "budget_alerts": alerts}


@api.patch("/transactions/{txn_id}")
async def update_transaction(txn_id: str, body: TransactionUpdate, user=Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        return {"ok": True}
    if "account_id" in updates:
        acc = await db.accounts.find_one({"id": updates["account_id"], "owner_id": user["current_ledger_id"]})
        if not acc:
            raise HTTPException(status_code=404, detail="Account not found")
        updates["account_name"] = acc["name"]
    await db.transactions.update_one({"id": txn_id, "owner_id": user["current_ledger_id"]}, {"$set": updates})
    return {"ok": True}


@api.delete("/transactions/{txn_id}")
async def delete_transaction(txn_id: str, user=Depends(get_current_user)):
    await db.transactions.delete_one({"id": txn_id, "owner_id": user["current_ledger_id"]})
    return {"ok": True}


# ----- Udhaar -----
@api.get("/udhaar")
async def list_udhaar(user=Depends(get_current_user)):
    rows = await db.udhaar.find(scope(user), {"_id": 0}).sort("created_at", -1).to_list(500)
    return rows


@api.post("/udhaar")
async def create_udhaar(body: UdhaarIn, user=Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "owner_id": user["current_ledger_id"],
        "person_name": body.person_name,
        "phone": body.phone or "",
        "type": body.type,
        "amount": float(body.amount),
        "note": body.note or "",
        "due_date": body.due_date or "",
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.udhaar.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.patch("/udhaar/{udhaar_id}")
async def update_udhaar(udhaar_id: str, body: UdhaarUpdate, user=Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        return {"ok": True}
    await db.udhaar.update_one({"id": udhaar_id, "owner_id": user["current_ledger_id"]}, {"$set": updates})
    return {"ok": True}


@api.delete("/udhaar/{udhaar_id}")
async def delete_udhaar(udhaar_id: str, user=Depends(get_current_user)):
    await db.udhaar.delete_one({"id": udhaar_id, "owner_id": user["current_ledger_id"]})
    return {"ok": True}


# ----- Recurring -----
def _next_due(from_dt: datetime, frequency: str, day_of_month: Optional[int]) -> datetime:
    if frequency == "daily":
        return from_dt + timedelta(days=1)
    if frequency == "weekly":
        return from_dt + timedelta(days=7)
    year = from_dt.year
    month = from_dt.month + 1
    if month > 12:
        month = 1
        year += 1
    day = min(day_of_month or from_dt.day, 28)
    return from_dt.replace(year=year, month=month, day=day)


@api.get("/recurring")
async def list_recurring(user=Depends(get_current_user)):
    return await db.recurring.find(scope(user), {"_id": 0}).to_list(500)


@api.post("/recurring")
async def create_recurring(body: RecurringIn, user=Depends(get_current_user)):
    acc = await db.accounts.find_one({"id": body.account_id, "owner_id": user["current_ledger_id"]})
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")
    now = datetime.now(timezone.utc)
    start = now
    if body.start_date:
        try:
            start = datetime.fromisoformat(body.start_date.replace("Z", "+00:00"))
        except Exception:
            start = now
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "owner_id": user["current_ledger_id"],
        "account_id": body.account_id,
        "account_name": acc["name"],
        "type": body.type,
        "amount": float(body.amount),
        "category": body.category,
        "note": body.note or "",
        "frequency": body.frequency,
        "day_of_month": body.day_of_month,
        "active": body.active,
        "start_date": start.isoformat(),
        "next_due": start.isoformat(),
        "last_run": None,
        "created_at": now.isoformat(),
    }
    await db.recurring.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.patch("/recurring/{rec_id}")
async def update_recurring(rec_id: str, body: dict, user=Depends(get_current_user)):
    allowed = {"active", "amount", "category", "note", "day_of_month", "frequency"}
    updates = {k: v for k, v in body.items() if k in allowed and v is not None}
    if updates:
        await db.recurring.update_one({"id": rec_id, "owner_id": user["current_ledger_id"]}, {"$set": updates})
    return {"ok": True}


@api.delete("/recurring/{rec_id}")
async def delete_recurring(rec_id: str, user=Depends(get_current_user)):
    await db.recurring.delete_one({"id": rec_id, "owner_id": user["current_ledger_id"]})
    return {"ok": True}


@api.post("/recurring/run")
async def run_recurring(user=Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    created = 0
    rows = await db.recurring.find({"owner_id": user["current_ledger_id"], "active": True}, {"_id": 0}).to_list(500)
    for r in rows:
        try:
            due = datetime.fromisoformat(r["next_due"].replace("Z", "+00:00"))
        except Exception:
            continue
        for _ in range(24):
            if due > now:
                break
            await db.transactions.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": user["id"],
                "owner_id": user["current_ledger_id"],
                "account_id": r["account_id"],
                "account_name": r["account_name"],
                "type": r["type"],
                "amount": r["amount"],
                "category": r["category"],
                "note": f"{r.get('note', '')} (recurring)".strip(),
                "date": due.isoformat(),
                "created_at": now.isoformat(),
                "recurring_id": r["id"],
            })
            created += 1
            due = _next_due(due, r["frequency"], r.get("day_of_month"))
        await db.recurring.update_one(
            {"id": r["id"], "owner_id": user["current_ledger_id"]},
            {"$set": {"next_due": due.isoformat(), "last_run": now.isoformat()}},
        )
    return {"created": created}


# ----- Budgets -----
@api.get("/budgets")
async def list_budgets(user=Depends(get_current_user)):
    rows = await db.budgets.find(scope(user), {"_id": 0}).to_list(200)
    now = datetime.now(timezone.utc)
    month_prefix = now.strftime("%Y-%m")
    spent_by_cat = {}
    txns = await db.transactions.find(
        {"owner_id": user["current_ledger_id"], "type": "expense"}, {"_id": 0}
    ).to_list(5000)
    for t in txns:
        d = t.get("date", "")
        if d.startswith(month_prefix):
            spent_by_cat[t["category"]] = spent_by_cat.get(t["category"], 0.0) + t["amount"]
    for b in rows:
        b["spent"] = round(spent_by_cat.get(b["category"], 0.0), 2)
        b["remaining"] = round(b["amount"] - b["spent"], 2)
        b["percent"] = round((b["spent"] / b["amount"] * 100) if b["amount"] > 0 else 0, 1)
    return rows


@api.post("/budgets")
async def upsert_budget(body: BudgetIn, user=Depends(get_current_user)):
    existing = await db.budgets.find_one({"owner_id": user["current_ledger_id"], "category": body.category})
    if existing:
        await db.budgets.update_one(
            {"id": existing["id"]},
            {"$set": {"amount": float(body.amount)}},
        )
        return {"ok": True, "id": existing["id"]}
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "owner_id": user["current_ledger_id"],
        "category": body.category,
        "amount": float(body.amount),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.budgets.insert_one(doc)
    return {"ok": True, "id": doc["id"]}


@api.delete("/budgets/{budget_id}")
async def delete_budget(budget_id: str, user=Depends(get_current_user)):
    await db.budgets.delete_one({"id": budget_id, "owner_id": user["current_ledger_id"]})
    return {"ok": True}


# ----- Analytics -----
@api.get("/analytics/summary")
async def analytics_summary(user=Depends(get_current_user)):
    pipeline = [
        {"$match": {"owner_id": user["current_ledger_id"]}},
        {"$group": {"_id": "$type", "total": {"$sum": "$amount"}}},
    ]
    agg = await db.transactions.aggregate(pipeline).to_list(10)
    income = sum(x["total"] for x in agg if x["_id"] == "income")
    expense = sum(x["total"] for x in agg if x["_id"] == "expense")

    accs = await db.accounts.find(scope(user), {"_id": 0}).to_list(500)
    total_balance = 0.0
    per_type = {}
    for a in accs:
        pipeline2 = [
            {"$match": {"owner_id": user["current_ledger_id"], "account_id": a["id"]}},
            {"$group": {"_id": "$type", "total": {"$sum": "$amount"}}},
        ]
        agg2 = await db.transactions.aggregate(pipeline2).to_list(10)
        inc = sum(x["total"] for x in agg2 if x["_id"] == "income")
        exp = sum(x["total"] for x in agg2 if x["_id"] == "expense")
        bal = round(a.get("opening_balance", 0.0) + inc - exp, 2)
        total_balance += bal
        per_type[a["type"]] = per_type.get(a["type"], 0.0) + bal

    ud = await db.udhaar.find({"owner_id": user["current_ledger_id"], "status": "pending"}, {"_id": 0}).to_list(500)
    lene = sum(x["amount"] for x in ud if x["type"] == "lene")
    dene = sum(x["amount"] for x in ud if x["type"] == "dene")

    pipeline3 = [
        {"$match": {"owner_id": user["current_ledger_id"], "type": "expense"}},
        {"$group": {"_id": "$category", "total": {"$sum": "$amount"}}},
        {"$sort": {"total": -1}},
    ]
    cats = await db.transactions.aggregate(pipeline3).to_list(50)
    categories = [{"category": c["_id"], "total": round(c["total"], 2)} for c in cats]

    return {
        "total_income": round(income, 2),
        "total_expense": round(expense, 2),
        "net_balance": round(total_balance, 2),
        "per_account_type": {k: round(v, 2) for k, v in per_type.items()},
        "udhaar_lene": round(lene, 2),
        "udhaar_dene": round(dene, 2),
        "expense_by_category": categories,
    }


@api.get("/analytics/monthly")
async def analytics_monthly(user=Depends(get_current_user)):
    rows = await db.transactions.find(scope(user), {"_id": 0}).to_list(5000)
    buckets = {}
    for r in rows:
        d = r.get("date", "")
        if not d:
            continue
        try:
            dt = datetime.fromisoformat(d.replace("Z", "+00:00"))
        except Exception:
            continue
        key = dt.strftime("%Y-%m")
        b = buckets.setdefault(key, {"month": key, "income": 0.0, "expense": 0.0})
        if r["type"] == "income":
            b["income"] += r["amount"]
        else:
            b["expense"] += r["amount"]
    out = sorted(buckets.values(), key=lambda x: x["month"])
    for b in out:
        b["income"] = round(b["income"], 2)
        b["expense"] = round(b["expense"], 2)
        b["savings"] = round(b["income"] - b["expense"], 2)
    return out[-12:]


# ----- AI Insights -----
@api.post("/ai/insights")
async def ai_insights(user=Depends(get_current_user)):
    summary = await analytics_summary(user)
    monthly = await analytics_monthly(user)
    currency = user.get("currency", "INR")

    if summary["total_income"] == 0 and summary["total_expense"] == 0:
        return {
            "headline": "Abhi tak koi data nahi hai — pehla transaction add karo!",
            "summary": "Jaise hi aap kuch income ya kharcha add karenge, main aapko personalized insights aur savings tips dunga.",
            "tips": [
                "Pehle apne primary Savings aur Current accounts add karo.",
                "Har chhoti-badi kharcha turant record karo — habit ban jayegi.",
                "Udhaar lene/dene bhi PaisaBook mein daalte raho.",
            ],
        }

    context = {"currency": currency, "summary": summary, "monthly_trend": monthly}

    system_msg = (
        "You are a friendly Indian personal finance coach called 'PaisaBuddy'. "
        "Speak in warm Hinglish (Hindi + English mix). Be concise, practical and non-judgmental. "
        "Return ONLY a JSON object with keys: headline (string, max 90 chars), "
        "summary (string, 2-3 sentences), tips (array of 3-5 short actionable tips). "
        "No markdown, no code fences, only pure JSON."
    )

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"insights-{user['id']}",
            system_message=system_msg,
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")

        msg = UserMessage(text=f"Currency: {currency}. Data:\n{context}")
        raw = await chat.send_message(msg)

        import json
        text = raw.strip()
        if text.startswith("```"):
            text = text.strip("`")
            if text.lower().startswith("json"):
                text = text[4:].strip()
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1:
            text = text[start:end + 1]
        return json.loads(text)
    except Exception as e:
        logger.exception("AI insights failed: %s", e)
        net = summary["total_income"] - summary["total_expense"]
        top_cat = summary["expense_by_category"][0]["category"] if summary["expense_by_category"] else None
        tips = []
        if net < 0:
            tips.append("Aapke kharche income se zyada hain — is mahine budget tight karna padega.")
        else:
            tips.append(f"Shabaash! Aap {currency} {round(net, 2)} save kar chuke ho.")
        if top_cat:
            tips.append(f"Sabse zyada kharcha '{top_cat}' pe ho raha hai.")
        if summary["udhaar_lene"] > 0:
            tips.append(f"Logon se {currency} {summary['udhaar_lene']} lena hai — reminder bhej do.")
        if summary["udhaar_dene"] > 0:
            tips.append(f"Aapko {currency} {summary['udhaar_dene']} dena hai.")
        tips.append("Har hafte ek baar PaisaBook check karo.")
        return {
            "headline": "Aapka Financial Snapshot",
            "summary": f"Total income {currency} {summary['total_income']}, kharcha {currency} {summary['total_expense']}, net {currency} {round(net, 2)}.",
            "tips": tips[:5],
        }


# ----- Exports (CSV / PDF) -----
async def _month_transactions(user: dict, month: Optional[str]) -> tuple[list, str]:
    """Fetch transactions for a YYYY-MM month (default: current)."""
    if not month:
        month = datetime.now(timezone.utc).strftime("%Y-%m")
    rows = await db.transactions.find(scope(user), {"_id": 0}).sort("date", -1).to_list(5000)
    rows = [r for r in rows if r.get("date", "").startswith(month)]
    return rows, month


@api.get("/export/csv")
async def export_csv(month: Optional[str] = None, user=Depends(get_current_user)):
    rows, month = await _month_transactions(user, month)
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["Date", "Type", "Category", "Account", "Amount", "Note"])
    for r in rows:
        d = r.get("date", "")
        try:
            d = datetime.fromisoformat(d.replace("Z", "+00:00")).strftime("%Y-%m-%d")
        except Exception:
            pass
        w.writerow([d, r["type"], r["category"], r.get("account_name", ""), r["amount"], r.get("note", "")])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="paisabook-{month}.csv"'},
    )


@api.get("/export/pdf")
async def export_pdf(month: Optional[str] = None, user=Depends(get_current_user)):
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_LEFT

    rows, month = await _month_transactions(user, month)
    summary = await analytics_summary(user)
    currency = user.get("currency", "INR")
    cur_sym = {"INR": "Rs.", "USD": "$", "EUR": "EUR ", "GBP": "GBP ", "AED": "AED "}.get(currency, "")
    ledger_name = user["current_ledger"]["name"]

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=1.6 * cm, rightMargin=1.6 * cm,
                            topMargin=1.6 * cm, bottomMargin=1.6 * cm, title=f"PaisaBook Report {month}")
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="TitleBig", fontSize=22, leading=26, textColor=colors.HexColor("#2A4F4F"), spaceAfter=6))
    styles.add(ParagraphStyle(name="Sub", fontSize=10, textColor=colors.HexColor("#57534E"), spaceAfter=14))
    styles.add(ParagraphStyle(name="H2", fontSize=13, leading=16, textColor=colors.HexColor("#1C1917"), spaceBefore=8, spaceAfter=6))

    story = []
    story.append(Paragraph("PaisaBook", styles["TitleBig"]))
    story.append(Paragraph(f"Monthly Report &middot; {month} &middot; Ledger: {ledger_name}", styles["Sub"]))

    m_income = sum(r["amount"] for r in rows if r["type"] == "income")
    m_expense = sum(r["amount"] for r in rows if r["type"] == "expense")
    m_net = m_income - m_expense

    story.append(Paragraph("This Month Summary", styles["H2"]))
    st = Table(
        [["Income", "Expense", "Net"],
         [f"{cur_sym}{m_income:,.2f}", f"{cur_sym}{m_expense:,.2f}", f"{cur_sym}{m_net:,.2f}"]],
        colWidths=[5.5 * cm, 5.5 * cm, 5.5 * cm],
    )
    st.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2A4F4F")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("PADDING", (0, 0), (-1, -1), 8),
        ("BACKGROUND", (0, 1), (0, 1), colors.HexColor("#EAF3EC")),
        ("BACKGROUND", (1, 1), (1, 1), colors.HexColor("#FAE9E3")),
        ("BACKGROUND", (2, 1), (2, 1), colors.HexColor("#FDF5E7")),
        ("FONTSIZE", (0, 1), (-1, 1), 14),
        ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
    ]))
    story.append(st)
    story.append(Spacer(1, 10))

    # Overall snapshot
    story.append(Paragraph("Overall Snapshot", styles["H2"]))
    ot = Table(
        [["Net Balance", "Udhaar Lene", "Udhaar Dene"],
         [f"{cur_sym}{summary['net_balance']:,.2f}",
          f"{cur_sym}{summary['udhaar_lene']:,.2f}",
          f"{cur_sym}{summary['udhaar_dene']:,.2f}"]],
        colWidths=[5.5 * cm, 5.5 * cm, 5.5 * cm],
    )
    ot.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F2F0EA")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#57534E")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("PADDING", (0, 0), (-1, -1), 8),
        ("FONTSIZE", (0, 1), (-1, 1), 12),
    ]))
    story.append(ot)
    story.append(Spacer(1, 12))

    # Transactions table
    story.append(Paragraph(f"Transactions ({len(rows)})", styles["H2"]))
    data = [["Date", "Type", "Category", "Account", "Amount"]]
    for r in rows[:200]:
        d = r.get("date", "")
        try:
            d = datetime.fromisoformat(d.replace("Z", "+00:00")).strftime("%d %b")
        except Exception:
            pass
        data.append([
            d,
            "Income" if r["type"] == "income" else "Expense",
            r.get("category", ""),
            r.get("account_name", "")[:20],
            f"{cur_sym}{r['amount']:,.2f}",
        ])
    if len(data) == 1:
        data.append(["-", "-", "No transactions", "-", "-"])
    tbl = Table(data, colWidths=[2.4 * cm, 2 * cm, 4 * cm, 4.6 * cm, 3.5 * cm], repeatRows=1)
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2A4F4F")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#FAF9F5"), colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E7E5DF")),
        ("PADDING", (0, 0), (-1, -1), 5),
        ("ALIGN", (4, 1), (4, -1), "RIGHT"),
    ]))
    # colour expense rows
    for idx, r in enumerate(rows[:200], start=1):
        color = colors.HexColor("#B15039") if r["type"] == "expense" else colors.HexColor("#3B6446")
        tbl.setStyle(TableStyle([("TEXTCOLOR", (4, idx), (4, idx), color)]))
    story.append(tbl)

    story.append(Spacer(1, 12))
    story.append(Paragraph(
        f"<font color='#78716C'><i>Generated by PaisaBook on {datetime.now(timezone.utc).strftime('%d %b %Y')}</i></font>",
        styles["Normal"],
    ))

    doc.build(story)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="paisabook-{month}.pdf"'},
    )


# ----- Health -----
@api.get("/")
async def root():
    return {"app": "PaisaBook", "status": "ok"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.accounts.create_index([("owner_id", 1)])
    await db.transactions.create_index([("owner_id", 1), ("date", -1)])
    await db.udhaar.create_index([("owner_id", 1)])
    await db.recurring.create_index([("owner_id", 1)])
    await db.budgets.create_index([("owner_id", 1), ("category", 1)], unique=True)
    await db.ledgers.create_index("invite_code")
    await db.ledgers.create_index("members")
    logger.info("PaisaBook API started")


@app.on_event("shutdown")
async def shutdown():
    client.close()
