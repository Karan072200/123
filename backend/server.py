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
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

# LLM providers — supports both Emergent LLM Key and direct Anthropic API key
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    _HAS_EMERGENT = True
except Exception:
    _HAS_EMERGENT = False

try:
    from anthropic import AsyncAnthropic
    _HAS_ANTHROPIC = True
except Exception:
    _HAS_ANTHROPIC = False

try:
    from groq import AsyncGroq
    _HAS_GROQ = True
except Exception:
    _HAS_GROQ = False

# ----- Config -----
JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ["JWT_SECRET"]
GOOGLE_CLIENT_ID = os.environ["GOOGLE_CLIENT_ID"]
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
LLM_MODEL = os.environ.get("LLM_MODEL", "claude-sonnet-4-5-20250929")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

mongo_url = os.environ["MONGO_URL"].strip().strip('"').strip("'")
if not (mongo_url.startswith("mongodb://") or mongo_url.startswith("mongodb+srv://")):
    raise RuntimeError(
        f"MONGO_URL must start with 'mongodb://' or 'mongodb+srv://'. "
        f"Got: {mongo_url[:30]!r}... "
        f"Check your environment variable — for MongoDB Atlas it should look like "
        f"'mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority'"
    )
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="Apka Munim API")

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


async def llm_json_call(system_msg: str, user_msg: str, session_id: str) -> Optional[str]:
    """
    Portable LLM call. Priority: Anthropic → Groq (free) → Emergent.
    Returns raw text or None if no provider is configured.
    """
    if ANTHROPIC_API_KEY and _HAS_ANTHROPIC:
        try:
            ac = AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
            resp = await ac.messages.create(
                model=LLM_MODEL,
                max_tokens=1024,
                system=system_msg,
                messages=[{"role": "user", "content": user_msg}],
            )
            return resp.content[0].text
        except Exception as e:
            logging.warning("Anthropic direct call failed: %s", e)

    if GROQ_API_KEY and _HAS_GROQ:
        try:
            gc = AsyncGroq(api_key=GROQ_API_KEY)
            resp = await gc.chat.completions.create(
                model=GROQ_MODEL,
                max_tokens=1024,
                messages=[
                    {"role": "system", "content": system_msg},
                    {"role": "user", "content": user_msg},
                ],
            )
            return resp.choices[0].message.content
        except Exception as e:
            logging.warning("Groq call failed: %s", e)

    if EMERGENT_LLM_KEY and _HAS_EMERGENT:
        try:
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=session_id,
                system_message=system_msg,
            ).with_model("anthropic", LLM_MODEL)
            return await chat.send_message(UserMessage(text=user_msg))
        except Exception as e:
            logging.warning("Emergent LLM call failed: %s", e)

    return None
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


class PinSetIn(BaseModel):
    pin: str  # 4-6 digits
    password: str  # current password to authorize


class PinVerifyIn(BaseModel):
    email: EmailStr
    pin: str


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str
    new_password: str


def validate_password_strength(password: str) -> tuple[bool, str]:
    """Returns (is_valid, error_message)"""
    import re
    if len(password) < 8:
        return False, "Password kam se kam 8 characters ka hona chahiye"
    if not re.search(r"[A-Z]", password):
        return False, "Password me ek uppercase letter (A-Z) hona chahiye"
    if not re.search(r"[a-z]", password):
        return False, "Password me ek lowercase letter (a-z) hona chahiye"
    if not re.search(r"[0-9]", password):
        return False, "Password me ek number (0-9) hona chahiye"
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>/?~`]", password):
        return False, "Password me ek special character (!@#$%^&* etc.) hona chahiye"
    return True, ""


def validate_pin(pin: str) -> tuple[bool, str]:
    if not pin.isdigit():
        return False, "PIN sirf numbers ka hona chahiye"
    if len(pin) < 4 or len(pin) > 6:
        return False, "PIN 4 se 6 digits ka hona chahiye"
    return True, ""


class AccountIn(BaseModel):
    name: str
    type: Literal["savings", "current", "cash", "wallet", "credit_card", "emergency", "investment", "other"] = "savings"
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
@limiter.limit("5/hour")
async def register(request: Request, body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    # Enforce strong password
    ok, err = validate_password_strength(body.password)
    if not ok:
        raise HTTPException(status_code=400, detail=err)

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
    response.set_cookie("access_token", token, httponly=True, secure=True, samesite="none",
                        domain=".apkamunim.com", max_age=60 * 60 * 24 * 7, path="/")
    return {"id": uid, "email": email, "name": body.name, "currency": body.currency, "token": token}


@api.post("/auth/login")
@limiter.limit("10/15minutes")
async def login(request: Request, body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], email)
    response.set_cookie("access_token", token, httponly=True, secure=True, samesite="none",
                        domain=".apkamunim.com", max_age=60 * 60 * 24 * 7, path="/")
    return {"id": user["id"], "email": email, "name": user["name"],
            "currency": user.get("currency", "INR"), "token": token}


class GoogleAuthIn(BaseModel):
    credential: str


@api.post("/auth/google")
@limiter.limit("15/hour")
async def google_auth(request: Request, body: GoogleAuthIn, response: Response):
    try:
        idinfo = google_id_token.verify_oauth2_token(
            body.credential, google_requests.Request(), GOOGLE_CLIENT_ID
        )
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    email = idinfo["email"].lower()
    name = idinfo.get("name", email.split("@")[0])

    user = await db.users.find_one({"email": email})
    if not user:
        uid = str(uuid.uuid4())
        personal_id = f"pl_{uid}"
        now = datetime.now(timezone.utc).isoformat()
        await db.users.insert_one({
            "id": uid,
            "email": email,
            "name": name,
            "password_hash": None,
            "currency": "INR",
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
        uid_final, name_final = uid, name
    else:
        uid_final, name_final = user["id"], user["name"]

    token = create_access_token(uid_final, email)
    response.set_cookie("access_token", token, httponly=True, secure=True, samesite="none",
                        domain=".apkamunim.com", max_age=60 * 60 * 24 * 7, path="/")
    return {"id": uid_final, "email": email, "name": name_final, "token": token}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/", domain=".apkamunim.com")
    return {"ok": True}


# ----- PIN Authentication -----
@api.post("/auth/pin/set")
async def set_pin(body: PinSetIn, user=Depends(get_current_user)):
    """Set or update 4-6 digit PIN. Requires current password to authorize."""
    ok, err = validate_pin(body.pin)
    if not ok:
        raise HTTPException(status_code=400, detail=err)
    # Verify password
    full = await db.users.find_one({"id": user["id"]})
    if not full or not verify_password(body.password, full["password_hash"]):
        raise HTTPException(status_code=401, detail="Password galat hai")
    pin_hash = hash_password(body.pin)
    await db.users.update_one({"id": user["id"]}, {"$set": {"pin_hash": pin_hash}})
    return {"ok": True, "message": "PIN set ho gaya!"}


@api.delete("/auth/pin")
async def delete_pin(user=Depends(get_current_user)):
    await db.users.update_one({"id": user["id"]}, {"$unset": {"pin_hash": ""}})
    return {"ok": True}


@api.get("/auth/pin/status")
async def pin_status(user=Depends(get_current_user)):
    full = await db.users.find_one({"id": user["id"]}, {"pin_hash": 1})
    return {"enabled": bool(full and full.get("pin_hash"))}


@api.post("/auth/pin/verify")
async def verify_pin(body: PinVerifyIn, response: Response):
    """Login via email + PIN combination."""
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not user.get("pin_hash"):
        raise HTTPException(status_code=401, detail="Invalid credentials or PIN not set")
    # Rate limit: track failed PIN attempts
    now_ts = datetime.now(timezone.utc)
    attempts_doc = await db.pin_attempts.find_one({"email": email})
    if attempts_doc and attempts_doc.get("locked_until"):
        locked_until = datetime.fromisoformat(attempts_doc["locked_until"])
        if now_ts < locked_until:
            wait_min = int((locked_until - now_ts).total_seconds() / 60) + 1
            raise HTTPException(status_code=429, detail=f"Bahut galat PIN — {wait_min} min me try karo")

    if not verify_password(body.pin, user["pin_hash"]):
        # Increment failed attempts
        fails = (attempts_doc.get("count", 0) if attempts_doc else 0) + 1
        update = {"count": fails, "email": email, "last_at": now_ts.isoformat()}
        if fails >= 5:
            update["locked_until"] = (now_ts + timedelta(minutes=15)).isoformat()
            update["count"] = 0
        await db.pin_attempts.update_one({"email": email}, {"$set": update}, upsert=True)
        raise HTTPException(status_code=401, detail=f"Galat PIN ({fails}/5)")

    # Success — clear attempts
    await db.pin_attempts.delete_one({"email": email})
    token = create_access_token(user["id"], email)
    response.set_cookie("access_token", token, httponly=True, secure=True, samesite="none",
                        max_age=60 * 60 * 24 * 7, path="/")
    return {"id": user["id"], "email": email, "name": user["name"],
            "currency": user.get("currency", "INR"), "token": token}


# ----- Forgot / Reset Password -----
def _send_reset_email(to_email: str, name: str, reset_link: str):
    """Send password reset email via Resend if configured. Fallback: log to console."""
    api_key = os.environ.get("RESEND_API_KEY", "").strip()
    sender = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev").strip()

    if not api_key or api_key == "your_resend_key_here":
        logger.warning("Resend not configured — reset link (dev mode): %s -> %s", to_email, reset_link)
        return {"dev_link": reset_link}

    try:
        import resend as resend_lib
        resend_lib.api_key = api_key
        html = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #F5F2ED; color: #1C1917;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; padding: 12px 20px; background: #2A4F4F; color: #E8B365; border-radius: 12px; font-size: 22px; font-weight: 800;">
              Apka Munim 🎩
            </div>
          </div>
          <div style="background: white; padding: 32px 24px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <h1 style="margin: 0 0 12px; font-size: 24px; color: #1C1917;">Namaste {name or 'friend'}! 👋</h1>
            <p style="font-size: 15px; line-height: 1.6; color: #57534E;">
              Aapne apne <strong>Apka Munim</strong> account ka password reset karne ke liye request bheji hai.
            </p>
            <p style="font-size: 15px; line-height: 1.6; color: #57534E;">
              Neeche wale button pe click karke naya password set karo. Yeh link <strong>60 minute</strong> tak valid hai.
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="{reset_link}" style="background: #2A4F4F; color: white; padding: 14px 32px; text-decoration: none; border-radius: 999px; font-weight: 600; display: inline-block; font-size: 15px;">
                Password Reset Karo
              </a>
            </div>
            <p style="font-size: 13px; color: #78716C; margin-top: 24px;">
              Ya yeh link copy karke browser me paste karo:<br>
              <span style="color: #2A4F4F; word-break: break-all; font-size: 12px;">{reset_link}</span>
            </p>
            <hr style="border: none; border-top: 1px solid #E7E5DF; margin: 24px 0;">
            <p style="font-size: 12px; color: #A8A29E; line-height: 1.5;">
              ⚠️ Agar aapne yeh request nahi bheji, toh is email ko ignore karo — aapka account safe hai.
            </p>
          </div>
          <div style="text-align: center; margin-top: 24px; font-size: 12px; color: #A8A29E;">
            Made with ❤️ in India · <a href="https://apkamunim.com" style="color: #2A4F4F;">apkamunim.com</a>
          </div>
        </div>
        """
        params = {
            "from": sender,
            "to": [to_email],
            "subject": "🔐 Apka Munim — Password Reset",
            "html": html,
        }
        result = resend_lib.Emails.send(params)
        logger.info("Reset email sent to %s (id=%s)", to_email, result.get("id"))
        return {"sent": True, "id": result.get("id")}
    except Exception as e:
        logger.exception("Failed to send reset email: %s", e)
        return {"error": str(e), "dev_link": reset_link}


@api.post("/auth/forgot-password")
@limiter.limit("5/hour")
async def forgot_password(body: ForgotPasswordIn, request: Request):
    """Generate reset token + send email. Always returns success even if email doesn't exist (privacy)."""
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user:
        # Do not reveal whether email exists
        return {"ok": True, "message": "Agar yeh email registered hai, toh reset link bhej diya."}

    import secrets
    token = secrets.token_urlsafe(32)
    expires = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    await db.password_reset_tokens.insert_one({
        "token": token,
        "user_id": user["id"],
        "email": email,
        "expires_at": expires,
        "used": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    # Build reset link — use frontend URL from env
    frontend_url = os.environ.get("FRONTEND_URL", "https://apkamunim.com").rstrip("/")
    reset_link = f"{frontend_url}/reset-password?token={token}"
    result = _send_reset_email(email, user.get("name", ""), reset_link)

    resp = {"ok": True, "message": "Reset link bhej diya! Email check karo."}
    if result.get("dev_link"):
        # dev mode — return link in response (only when no API key)
        resp["dev_link"] = result["dev_link"]
    return resp


@api.post("/auth/reset-password")
async def reset_password(body: ResetPasswordIn, response: Response):
    """Verify token + set new password."""
    ok, err = validate_password_strength(body.new_password)
    if not ok:
        raise HTTPException(status_code=400, detail=err)

    doc = await db.password_reset_tokens.find_one({"token": body.token, "used": False})
    if not doc:
        raise HTTPException(status_code=400, detail="Invalid ya used token")
    try:
        exp = datetime.fromisoformat(doc["expires_at"])
        if datetime.now(timezone.utc) > exp:
            raise HTTPException(status_code=400, detail="Token expire ho gaya — dobara request karo")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid token")

    await db.users.update_one({"id": doc["user_id"]},
                              {"$set": {"password_hash": hash_password(body.new_password)}})
    await db.password_reset_tokens.update_one({"token": body.token},
                                              {"$set": {"used": True}})
    return {"ok": True, "message": "Password reset ho gaya! Ab login karo."}


# ----- Auth (rest) -----


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


@api.get("/auth/me/export")
async def export_my_data(user=Depends(get_current_user)):
    """Export ALL of the current user's data across their ledgers (compliance/GDPR-ready)."""
    uid = user["id"]
    my_ledgers = await db.ledgers.find({"members": uid}, {"_id": 0}).to_list(50)
    ledger_ids = [l["id"] for l in my_ledgers]

    async def _all(coll):
        return await db[coll].find({"$or": [{"user_id": uid}, {"owner_id": {"$in": ledger_ids}}]}, {"_id": 0}).to_list(10000)

    return {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "user": {
            "id": user["id"], "email": user["email"], "name": user["name"],
            "currency": user.get("currency", "INR"),
            "created_at": user.get("created_at"),
        },
        "ledgers": my_ledgers,
        "accounts": await _all("accounts"),
        "transactions": await _all("transactions"),
        "udhaar": await _all("udhaar"),
        "recurring": await _all("recurring"),
        "budgets": await _all("budgets"),
    }


@api.delete("/auth/me")
async def delete_my_account(response: Response, user=Depends(get_current_user)):
    """Permanently delete the current user's account and all their data (Play Store 'Data Safety' compliance)."""
    uid = user["id"]
    # Delete personal-scoped data
    personal_ledger_id = user["personal_ledger_id"]
    for coll in ("accounts", "transactions", "udhaar", "recurring", "budgets"):
        await db[coll].delete_many({"owner_id": personal_ledger_id})
        # legacy docs
        await db[coll].delete_many({"user_id": uid, "owner_id": {"$exists": False}})
    # Remove from shared ledgers
    shared = await db.ledgers.find({"members": uid, "type": "shared"}, {"_id": 0}).to_list(50)
    for lg in shared:
        if lg.get("owner_user_id") == uid and len(lg.get("members", [])) == 1:
            # sole owner: delete ledger + data
            for coll in ("accounts", "transactions", "udhaar", "recurring", "budgets"):
                await db[coll].delete_many({"owner_id": lg["id"]})
            await db.ledgers.delete_one({"id": lg["id"]})
        else:
            await db.ledgers.update_one({"id": lg["id"]}, {"$pull": {"members": uid}})
    # Delete personal ledger
    await db.ledgers.delete_one({"id": personal_ledger_id})
    # Delete user
    await db.users.delete_one({"id": uid})
    response.delete_cookie("access_token", path="/", domain=".apkamunim.com")
    return {"ok": True}


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


# ----- SMS / UPI Parser -----
import re

CATEGORY_KEYWORDS = {
    "Food": ["zomato", "swiggy", "dominos", "domino", "pizza", "mcd", "mcdonald", "kfc",
             "burger", "starbucks", "cafe", "restaurant", "food", "eatsure", "eazydiner"],
    "Groceries": ["bigbasket", "blinkit", "zepto", "instamart", "grofers", "dmart",
                  "reliance fresh", "grocery", "kirana"],
    "Transport": ["uber", "ola", "rapido", "yulu", "namma metro", "irctc", "railway",
                  "petrol", "hpcl", "iocl", "bpcl", "indianoil", "fastag", "metro"],
    "Shopping": ["amazon", "flipkart", "myntra", "ajio", "meesho", "nykaa", "tatacliq",
                 "shoppers stop", "reliance trends", "croma"],
    "Bills": ["airtel", "jio", "vi ", "vodafone", "electricity", "bescom", "msedcl",
              "adani electricity", "torrent power", "gas bill", "mahanagar gas", "igl",
              "water bill", "broadband", "act fibernet", "recharge", "postpaid", "dth"],
    "Entertainment": ["netflix", "hotstar", "prime video", "amazon prime", "spotify",
                      "youtube premium", "sonyliv", "bookmyshow", "pvr", "inox"],
    "Health": ["pharmeasy", "netmeds", "1mg", "apollo", "practo", "medlife", "hospital",
               "clinic", "pharmacy", "medicine"],
    "Education": ["byju", "unacademy", "vedantu", "coursera", "udemy", "school", "college",
                  "fees"],
    "Travel": ["makemytrip", "goibibo", "yatra", "irctc", "airbnb", "oyo", "cleartrip",
               "ixigo", "indigo", "vistara", "spicejet", "airindia"],
    "Rent": ["rent"],
    "Salary": ["salary", "sal cr", "salary credit"],
    "Business": ["invoice", "payment received", "business"],
    "Freelance": ["upwork", "fiverr", "freelance"],
    "Investment": ["mutual fund", "sip", "zerodha", "groww", "kite", "coin", "smallcase"],
    "Gift": ["gift"],
}


def _guess_category(text: str, txn_type: str) -> str:
    t = text.lower()
    for cat, kws in CATEGORY_KEYWORDS.items():
        for kw in kws:
            if kw in t:
                if txn_type == "income" and cat not in ("Salary", "Business", "Freelance", "Investment", "Gift"):
                    continue
                if txn_type == "expense" and cat in ("Salary", "Business", "Freelance", "Investment", "Gift"):
                    continue
                return cat
    return "Other Income" if txn_type == "income" else "Other"


def _detect_type(text: str) -> Optional[str]:
    t = text.lower()
    debit_words = ["debited", "debit", "paid", "sent", "deducted", "withdrawn", "spent", "purchase"]
    credit_words = ["credited", "credit", "received", "deposited", "refund", "salary"]
    d = any(w in t for w in debit_words)
    c = any(w in t for w in credit_words)
    if d and not c:
        return "expense"
    if c and not d:
        return "income"
    if d:
        return "expense"
    if c:
        return "income"
    return None


def _extract_merchant(text: str) -> Optional[str]:
    """Try multiple patterns; pick most specific."""
    patterns = [
        r"UPI[/\-]([A-Za-z][A-Za-z0-9 &.\-]{2,40}?)(?:/|\s+on\s|\s+ref|\.|$)",
        r"paid to\s+([A-Za-z][A-Za-z0-9 &.\-]{2,40}?)(?:\s+via|\s+on|\.|,|$)",
        r"to\s+([a-zA-Z][a-zA-Z0-9._\-]{2,40})@[a-zA-Z]+",
        r"received from\s+([A-Za-z][A-Za-z0-9 &.\-]{2,40}?)(?:\s+on|\.|,|$)",
        r"at\s+([A-Z][A-Za-z0-9 &.\-]{2,40}?)(?:\s+on|\.|,|$)",
    ]
    skip = {"your", "the", "a/c", "salary", "credit", "debit", "customer", "account", "hdfc", "sbi", "icici", "axis", "kotak"}
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            name = m.group(1).strip().rstrip(".,/-").strip()
            if name and name.lower() not in skip and len(name) >= 2:
                return name[:40]
    return None


AMOUNT_RE = re.compile(
    r"(?:rs\.?|inr|rupees|₹)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)",
    re.IGNORECASE,
)
ACC_LAST4_RE = re.compile(r"a/?c[^0-9]*([0-9]{4})", re.IGNORECASE)
XX_LAST4_RE = re.compile(r"x{2,}(\d{4})", re.IGNORECASE)


def parse_sms_regex(text: str) -> dict:
    result = {
        "type": None, "amount": None, "merchant": None,
        "account_last4": None, "raw": text.strip(),
        "confidence": 0.0,
    }
    if not text or len(text) < 8:
        return result

    m = AMOUNT_RE.search(text)
    if m:
        try:
            result["amount"] = float(m.group(1).replace(",", "").replace(" ", ""))
            result["confidence"] += 0.4
        except Exception:
            pass

    result["type"] = _detect_type(text)
    if result["type"]:
        result["confidence"] += 0.3

    m = ACC_LAST4_RE.search(text) or XX_LAST4_RE.search(text)
    if m:
        result["account_last4"] = m.group(1)
        result["confidence"] += 0.15

    merchant = _extract_merchant(text)
    if merchant:
        result["merchant"] = merchant
        result["confidence"] += 0.15
    return result


class SmsParseIn(BaseModel):
    text: str


@api.post("/sms/parse")
async def parse_sms(body: SmsParseIn, user=Depends(get_current_user)):
    text = (body.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Empty SMS")

    parsed = parse_sms_regex(text)

    # match account by last-4 digits in name
    account = None
    if parsed["account_last4"]:
        accs = await db.accounts.find(scope(user), {"_id": 0}).to_list(500)
        for a in accs:
            if parsed["account_last4"] in (a.get("name", "") + " " + a.get("note", "")):
                account = a
                break

    if not account:
        accs = await db.accounts.find(scope(user), {"_id": 0}).to_list(1)
        account = accs[0] if accs else None

    # If we couldn't extract essentials via regex, ask the LLM as a fallback
    llm_used = False
    if parsed["confidence"] < 0.5 or parsed["amount"] is None or not parsed["type"]:
        try:
            raw = await llm_json_call(
                system_msg=(
                    "You are an Indian bank/UPI SMS parser. Given raw SMS text, extract structured JSON. "
                    "Return ONLY a JSON object with keys: type ('income' or 'expense'), amount (number), "
                    "merchant (string, empty if unknown), account_last4 (4-digit string or empty). "
                    "No markdown, no code fences, JSON only."
                ),
                user_msg=f"Parse this SMS: {text}",
                session_id=f"sms-{user['id']}",
            )
            if raw:
                import json
                s = raw.strip()
                if s.startswith("```"):
                    s = s.strip("`")
                    if s.lower().startswith("json"):
                        s = s[4:].strip()
                i, j = s.find("{"), s.rfind("}")
                if i != -1 and j != -1:
                    data = json.loads(s[i:j + 1])
                    if not parsed["amount"] and data.get("amount"):
                        parsed["amount"] = float(data["amount"])
                    if not parsed["type"] and data.get("type"):
                        parsed["type"] = data["type"]
                    if not parsed["merchant"] and data.get("merchant"):
                        parsed["merchant"] = data["merchant"]
                    if not parsed["account_last4"] and data.get("account_last4"):
                        parsed["account_last4"] = data["account_last4"]
                    parsed["confidence"] = max(parsed["confidence"], 0.75)
                    llm_used = True
        except Exception as e:
            logger.warning("SMS LLM fallback failed: %s", e)

    txn_type = parsed["type"] or "expense"
    category = _guess_category(text, txn_type)

    return {
        "type": txn_type,
        "amount": parsed["amount"] or 0.0,
        "merchant": parsed["merchant"] or "",
        "account_last4": parsed["account_last4"] or "",
        "suggested_account_id": account["id"] if account else None,
        "suggested_account_name": account["name"] if account else None,
        "category": category,
        "note": (parsed["merchant"] or "SMS") + (f" · ...{parsed['account_last4']}" if parsed["account_last4"] else ""),
        "confidence": round(parsed["confidence"], 2),
        "llm_used": llm_used,
        "raw": text,
    }


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
                "Udhaar lene/dene bhi Apka Munim mein daalte raho.",
            ],
        }

    context = {"currency": currency, "summary": summary, "monthly_trend": monthly}

    system_msg = (
        "You are a friendly Indian personal finance coach called 'Munim Ji'. "
        "Speak in warm Hinglish (Hindi + English mix). Be concise, practical and non-judgmental. "
        "Return ONLY a JSON object with keys: headline (string, max 90 chars), "
        "summary (string, 2-3 sentences), tips (array of 3-5 short actionable tips). "
        "No markdown, no code fences, only pure JSON."
    )

    try:
        raw = await llm_json_call(
            system_msg=system_msg,
            user_msg=f"Currency: {currency}. Data:\n{context}",
            session_id=f"insights-{user['id']}",
        )
        if not raw:
            raise RuntimeError("No LLM provider configured")

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
        tips.append("Har hafte ek baar Apka Munim check karo.")
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
                            topMargin=1.6 * cm, bottomMargin=1.6 * cm, title=f"Apka Munim Report {month}")
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="TitleBig", fontSize=22, leading=26, textColor=colors.HexColor("#2A4F4F"), spaceAfter=6))
    styles.add(ParagraphStyle(name="Sub", fontSize=10, textColor=colors.HexColor("#57534E"), spaceAfter=14))
    styles.add(ParagraphStyle(name="H2", fontSize=13, leading=16, textColor=colors.HexColor("#1C1917"), spaceBefore=8, spaceAfter=6))

    story = []
    story.append(Paragraph("Apka Munim", styles["TitleBig"]))
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
        f"<font color='#78716C'><i>Generated by Apka Munim on {datetime.now(timezone.utc).strftime('%d %b %Y')}</i></font>",
        styles["Normal"],
    ))

    doc.build(story)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="paisabook-{month}.pdf"'},
    )


# ----- AI Chat (Munim Ji) — conversational -----
class ChatMessageIn(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatIn(BaseModel):
    messages: List[ChatMessageIn]


@api.post("/ai/chat")
async def ai_chat(body: ChatIn, user=Depends(get_current_user)):
    """Conversational chat with Munim Ji. Uses last 6 messages + user's financial context."""
    if not body.messages:
        raise HTTPException(status_code=400, detail="No messages")

    # Get user's financial snapshot for context
    summary = await analytics_summary(user)
    currency = user.get("currency", "INR")

    context_lines = [
        f"User's name: {user.get('name', 'friend')}",
        f"Currency: {currency}",
        f"This month income: {currency}{summary.get('total_income', 0):.0f}",
        f"This month expense: {currency}{summary.get('total_expense', 0):.0f}",
        f"Net balance: {currency}{summary.get('net_balance', 0):.0f}",
        f"Udhaar lena (to receive): {currency}{summary.get('udhaar_lene', 0):.0f}",
        f"Udhaar dena (to pay): {currency}{summary.get('udhaar_dene', 0):.0f}",
    ]
    top_cats = summary.get("expense_by_category", [])[:3]
    if top_cats:
        context_lines.append("Top expense categories: " + ", ".join(
            f"{c['category']} ({currency}{c['total']:.0f})" for c in top_cats
        ))
    context = "\n".join(context_lines)

    system_msg = (
        "You are 'Munim Ji' — a friendly, witty Indian personal finance advisor. "
        "You speak in warm Hinglish (Hindi mixed with English). Keep replies SHORT (2-4 sentences max) "
        "and conversational. Use emojis occasionally. Be practical, non-judgmental, encouraging. "
        "If user asks about their finances, use the CONTEXT below. If unclear, ask a clarifying question. "
        "If asked to add a transaction, tell them to use the 'Transaction' button (you cannot add for them). "
        "Never make up numbers not in context. Never give investment advice for specific stocks/funds. "
        f"\n\nCURRENT USER CONTEXT:\n{context}"
    )

    # Take last 6 messages (for token efficiency)
    recent = body.messages[-6:]
    user_msg_parts = []
    for m in recent[:-1]:
        prefix = "User: " if m.role == "user" else "Munim Ji: "
        user_msg_parts.append(f"{prefix}{m.content}")
    user_msg_parts.append(f"User: {recent[-1].content}")
    user_msg_parts.append("Munim Ji:")
    user_msg = "\n".join(user_msg_parts)

    try:
        reply = await llm_json_call(
            system_msg=system_msg,
            user_msg=user_msg,
            session_id=f"chat-{user['id']}",
        )
        if not reply:
            reply = "Bhai abhi thoda dimag out of order hai 😅 — thodi der baad try karo!"
        # Clean any markdown/quotes
        reply = reply.strip().strip('"').strip()
        if reply.startswith("Munim Ji:"):
            reply = reply[len("Munim Ji:"):].strip()
        return {"reply": reply}
    except Exception as e:
        logger.exception("AI chat failed: %s", e)
        # Fallback simple response
        last_user = recent[-1].content.lower()
        if "kharcha" in last_user or "expense" in last_user:
            fallback = f"Iss mahine total kharcha {currency}{summary.get('total_expense', 0):.0f} hua hai. Kya specific poochna hai?"
        elif "income" in last_user or "aaya" in last_user or "salary" in last_user:
            fallback = f"Iss mahine {currency}{summary.get('total_income', 0):.0f} aayi hai. Savings kaisi chal rahi hai?"
        elif "udhaar" in last_user:
            fallback = f"Aapko {currency}{summary.get('udhaar_lene', 0):.0f} lene hain aur {currency}{summary.get('udhaar_dene', 0):.0f} dene hain."
        else:
            fallback = "Namaste! Main Munim Ji. Aap finance ke baare me kuch bhi puch sakte ho — kharcha, savings, udhaar, budget."
        return {"reply": fallback, "fallback": True}


# ----- Financial Goals (Sapno ka Wallet) -----
class GoalIn(BaseModel):
    name: str
    target_amount: float
    saved_amount: float = 0.0
    target_date: Optional[str] = None
    emoji: str = "🎯"
    color: str = "#4A7C59"
    account_id: Optional[str] = None


class GoalUpdate(BaseModel):
    name: Optional[str] = None
    target_amount: Optional[float] = None
    saved_amount: Optional[float] = None
    target_date: Optional[str] = None
    emoji: Optional[str] = None
    color: Optional[str] = None
    account_id: Optional[str] = None


@api.get("/goals")
async def list_goals(user=Depends(get_current_user)):
    rows = await db.goals.find(scope(user), {"_id": 0}).sort("created_at", -1).to_list(500)
    # Enrich each goal with savings breakdown
    now = datetime.now(timezone.utc).date()
    for g in rows:
        target_amt = float(g.get("target_amount", 0))
        saved_amt = float(g.get("saved_amount", 0))
        remaining = max(0, target_amt - saved_amt)
        pct = round((saved_amt / target_amt * 100) if target_amt > 0 else 0, 1)

        breakdown = {
            "remaining": round(remaining, 2),
            "percent": pct,
            "days_left": None,
            "per_day": None,
            "per_week": None,
            "per_month": None,
            "status": "on_track",
        }

        target_date_str = g.get("target_date")
        if target_date_str and remaining > 0:
            try:
                tgt = datetime.strptime(target_date_str, "%Y-%m-%d").date()
                days = (tgt - now).days
                if days > 0:
                    breakdown["days_left"] = days
                    breakdown["per_day"] = round(remaining / days, 2)
                    breakdown["per_week"] = round(remaining / (days / 7), 2)
                    breakdown["per_month"] = round(remaining / (days / 30.44), 2)
                    if days < 30:
                        breakdown["status"] = "urgent"
                    elif days < 90:
                        breakdown["status"] = "soon"
                else:
                    breakdown["status"] = "overdue"
                    breakdown["days_left"] = 0
            except Exception:
                pass
        elif remaining == 0:
            breakdown["status"] = "achieved"

        g["breakdown"] = breakdown
    return rows


@api.post("/goals")
async def create_goal(body: GoalIn, user=Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "owner_id": user["current_ledger_id"],
        "user_id": user["id"],
        "name": body.name,
        "target_amount": float(body.target_amount),
        "saved_amount": float(body.saved_amount or 0.0),
        "target_date": body.target_date,
        "emoji": body.emoji or "🎯",
        "color": body.color or "#4A7C59",
        "account_id": body.account_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.goals.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.patch("/goals/{goal_id}")
async def update_goal(goal_id: str, body: GoalUpdate, user=Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    res = await db.goals.update_one({"id": goal_id, **scope(user)}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
    doc = await db.goals.find_one({"id": goal_id}, {"_id": 0})
    return doc


@api.delete("/goals/{goal_id}")
async def delete_goal(goal_id: str, user=Depends(get_current_user)):
    res = await db.goals.delete_one({"id": goal_id, **scope(user)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
    return {"ok": True}


@api.post("/goals/{goal_id}/contribute")
async def contribute_to_goal(goal_id: str, amount: float, user=Depends(get_current_user)):
    goal = await db.goals.find_one({"id": goal_id, **scope(user)})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    new_saved = float(goal.get("saved_amount", 0)) + float(amount)
    await db.goals.update_one({"id": goal_id}, {"$set": {"saved_amount": new_saved}})
    return {"ok": True, "saved_amount": new_saved, "target_amount": goal["target_amount"]}


# ----- Subscription Tracker -----
class SubscriptionIn(BaseModel):
    name: str
    amount: float
    category: str = "Entertainment"
    billing_cycle: Literal["monthly", "quarterly", "yearly", "weekly"] = "monthly"
    next_billing_date: Optional[str] = None
    account_id: Optional[str] = None
    emoji: str = "💳"
    color: str = "#D96C52"
    active: bool = True
    website: Optional[str] = ""


class SubscriptionUpdate(BaseModel):
    name: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    billing_cycle: Optional[Literal["monthly", "quarterly", "yearly", "weekly"]] = None
    next_billing_date: Optional[str] = None
    account_id: Optional[str] = None
    emoji: Optional[str] = None
    color: Optional[str] = None
    active: Optional[bool] = None
    website: Optional[str] = None


@api.get("/subscriptions")
async def list_subscriptions(user=Depends(get_current_user)):
    rows = await db.subscriptions.find(scope(user), {"_id": 0}).sort("next_billing_date", 1).to_list(500)
    # compute monthly total
    monthly_total = 0.0
    for r in rows:
        if not r.get("active"):
            continue
        amt = float(r.get("amount", 0))
        cycle = r.get("billing_cycle", "monthly")
        if cycle == "monthly":
            monthly_total += amt
        elif cycle == "yearly":
            monthly_total += amt / 12
        elif cycle == "quarterly":
            monthly_total += amt / 3
        elif cycle == "weekly":
            monthly_total += amt * 4.33
    return {"subscriptions": rows, "monthly_total": round(monthly_total, 2)}


@api.post("/subscriptions")
async def create_subscription(body: SubscriptionIn, user=Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "owner_id": user["current_ledger_id"],
        "user_id": user["id"],
        **body.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.subscriptions.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.patch("/subscriptions/{sub_id}")
async def update_subscription(sub_id: str, body: SubscriptionUpdate, user=Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    res = await db.subscriptions.update_one({"id": sub_id, **scope(user)}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Subscription not found")
    doc = await db.subscriptions.find_one({"id": sub_id}, {"_id": 0})
    return doc


@api.delete("/subscriptions/{sub_id}")
async def delete_subscription(sub_id: str, user=Depends(get_current_user)):
    res = await db.subscriptions.delete_one({"id": sub_id, **scope(user)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {"ok": True}


# ----- Financial Health Score -----
@api.get("/analytics/health-score")
async def health_score(user=Depends(get_current_user)):
    """Calculate 0-100 financial health score based on:
    - Savings rate (40%)
    - Budget adherence (25%)
    - Udhaar balance (15%)
    - Diversification (10%)
    - Activity/tracking (10%)
    """
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

    # Get this month's txns
    txns = await db.transactions.find(
        {**scope(user), "date": {"$gte": month_start}}, {"_id": 0}
    ).to_list(5000)
    total_income = sum(t["amount"] for t in txns if t["type"] == "income")
    total_expense = sum(t["amount"] for t in txns if t["type"] == "expense")
    savings = total_income - total_expense
    savings_rate = (savings / total_income * 100) if total_income > 0 else 0

    # Score components
    scores = {}

    # 1. Savings rate (40 pts) — ideally save >20%
    if savings_rate >= 30:
        scores["savings"] = 40
    elif savings_rate >= 20:
        scores["savings"] = 32
    elif savings_rate >= 10:
        scores["savings"] = 20
    elif savings_rate >= 0:
        scores["savings"] = 10
    else:
        scores["savings"] = 0

    # 2. Budget adherence (25 pts)
    budgets = await db.budgets.find(scope(user), {"_id": 0}).to_list(200)
    if budgets:
        breach_count = 0
        for b in budgets:
            spent = sum(t["amount"] for t in txns if t["type"] == "expense" and t["category"] == b["category"])
            if spent > b["amount"]:
                breach_count += 1
        adherence = (len(budgets) - breach_count) / len(budgets)
        scores["budget"] = int(adherence * 25)
    else:
        scores["budget"] = 12  # partial credit for no budgets yet

    # 3. Udhaar balance (15 pts) — less pending is better
    udhaars = await db.udhaar.find({**scope(user), "status": "pending"}, {"_id": 0}).to_list(200)
    dene_amt = sum(u["amount"] for u in udhaars if u["type"] == "dene")
    lene_amt = sum(u["amount"] for u in udhaars if u["type"] == "lene")
    net_udhaar = dene_amt - lene_amt  # positive = more to give, negative = more to receive
    if total_income > 0:
        udhaar_ratio = abs(net_udhaar) / total_income
        if udhaar_ratio < 0.1:
            scores["udhaar"] = 15
        elif udhaar_ratio < 0.3:
            scores["udhaar"] = 10
        elif udhaar_ratio < 0.5:
            scores["udhaar"] = 5
        else:
            scores["udhaar"] = 0
    else:
        scores["udhaar"] = 10

    # 4. Diversification (10 pts) — multiple accounts
    accounts = await db.accounts.find(scope(user), {"_id": 0}).to_list(50)
    if len(accounts) >= 3:
        scores["diversification"] = 10
    elif len(accounts) == 2:
        scores["diversification"] = 7
    elif len(accounts) == 1:
        scores["diversification"] = 4
    else:
        scores["diversification"] = 0

    # 5. Activity/tracking (10 pts) — txns this month
    if len(txns) >= 20:
        scores["activity"] = 10
    elif len(txns) >= 10:
        scores["activity"] = 7
    elif len(txns) >= 5:
        scores["activity"] = 4
    else:
        scores["activity"] = 1

    total_score = sum(scores.values())

    # Grade & Motto
    if total_score >= 85:
        grade = "A+"
        motto = "Paisa ka Baadshah 👑"
        message = "Bhai tum toh Ambani ban rahe ho — ekdum solid financial habits!"
    elif total_score >= 70:
        grade = "A"
        motto = "Money Master 💪"
        message = "Wah bhai wah! Financial planning ekdum sahi track pe hai."
    elif total_score >= 55:
        grade = "B"
        motto = "Sudhaar Chahiye 📈"
        message = "Achha kar rahe ho, but thoda aur bachao — future ka sochke."
    elif total_score >= 40:
        grade = "C"
        motto = "Kharcha King 💸"
        message = "Bhai kharcha kam karo — budget follow karne se score improve hoga."
    else:
        grade = "D"
        motto = "Munim Ji ki Zaroorat 😅"
        message = "Bhai ekdum se hisab-kitab shuru karo, budget banao — abhi improve karne ka time hai!"

    return {
        "score": total_score,
        "grade": grade,
        "motto": motto,
        "message": message,
        "breakdown": scores,
        "stats": {
            "total_income": round(total_income, 2),
            "total_expense": round(total_expense, 2),
            "savings": round(savings, 2),
            "savings_rate": round(savings_rate, 1),
            "transaction_count": len(txns),
            "accounts_count": len(accounts),
            "pending_udhaar_dene": round(dene_amt, 2),
            "pending_udhaar_lene": round(lene_amt, 2),
        },
    }


# ----- Streaks -----
@api.get("/analytics/streak")
async def get_streak(user=Depends(get_current_user)):
    """Calculate current tracking streak (consecutive days with at least one transaction)"""
    txns = await db.transactions.find(
        scope(user), {"_id": 0, "date": 1}
    ).sort("date", -1).to_list(500)

    if not txns:
        return {"current_streak": 0, "longest_streak": 0, "today_tracked": False, "message": "Aaj kuch add karo — streak shuru karo!"}

    # Get unique dates (YYYY-MM-DD)
    dates = set()
    for t in txns:
        d = t.get("date", "")
        if d:
            dates.add(d[:10])
    dates_sorted = sorted(dates, reverse=True)

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    yesterday_str = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")

    today_tracked = today_str in dates
    # Streak counts from today (if tracked) or yesterday (still active)
    if today_str in dates:
        current_date = datetime.now(timezone.utc)
    elif yesterday_str in dates:
        current_date = datetime.now(timezone.utc) - timedelta(days=1)
    else:
        return {"current_streak": 0, "longest_streak": 0, "today_tracked": False,
                "message": "Streak toot gayi! Aaj se dobara shuru karo."}

    current_streak = 0
    while current_date.strftime("%Y-%m-%d") in dates:
        current_streak += 1
        current_date -= timedelta(days=1)

    # Longest streak
    longest_streak = 0
    temp_streak = 0
    prev_date = None
    for d_str in sorted(dates):
        d = datetime.strptime(d_str, "%Y-%m-%d")
        if prev_date is None or (d - prev_date).days == 1:
            temp_streak += 1
        else:
            temp_streak = 1
        longest_streak = max(longest_streak, temp_streak)
        prev_date = d

    # Fun message
    if current_streak >= 30:
        msg = f"🔥 {current_streak} din streak! Tum toh Money Master ho gaye!"
    elif current_streak >= 7:
        msg = f"🔥 {current_streak} din straight — kamaal ka discipline!"
    elif current_streak >= 3:
        msg = f"🎯 {current_streak} din streak — keep going bhai!"
    elif current_streak >= 1:
        msg = f"✨ Streak shuru! Kal bhi track karna mat bhoolna."
    else:
        msg = "Aaj kuch add karo — streak shuru karo!"

    return {
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "today_tracked": today_tracked,
        "message": msg,
    }


# ----- Meme Alerts (Fun Notifications) -----
@api.get("/analytics/vibe-check")
async def vibe_check(user=Depends(get_current_user)):
    """Return a funny/motivational one-liner based on current state"""
    import random
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

    txns = await db.transactions.find(
        {**scope(user), "date": {"$gte": month_start}}, {"_id": 0}
    ).to_list(2000)
    total_income = sum(t["amount"] for t in txns if t["type"] == "income")
    total_expense = sum(t["amount"] for t in txns if t["type"] == "expense")

    # Category-specific memes
    cat_totals = {}
    for t in txns:
        if t["type"] == "expense":
            cat_totals[t["category"]] = cat_totals.get(t["category"], 0) + t["amount"]
    top_cat = max(cat_totals.items(), key=lambda x: x[1]) if cat_totals else None

    memes = []

    # Balance-based memes
    if total_income == 0 and total_expense == 0:
        memes = [
            {"emoji": "😴", "text": "Iss mahine kuch bhi track nahi kiya. Munim Ji so gaya hai."},
            {"emoji": "🤔", "text": "Bhai kharcha kaha kar rahe ho? App ko batao!"},
        ]
    elif total_expense > total_income:
        memes = [
            {"emoji": "😱", "text": "Kharcha income se zyada! Warren Buffet ne kuch aur socha hoga."},
            {"emoji": "💸", "text": "Paisa udd raha hai — udhaar lene ki nobat na aa jaye."},
            {"emoji": "🚨", "text": "RED ALERT: Kharcha > Income. Kuch to gadbad hai."},
        ]
    elif total_income > 0 and (total_income - total_expense) / total_income > 0.3:
        memes = [
            {"emoji": "👑", "text": "30%+ bachat! Ambani beta ban rahe ho."},
            {"emoji": "🎉", "text": "Great savings this month — Munim Ji proud hai!"},
            {"emoji": "💰", "text": "Solid bachat — SIP shuru karo, karod pati ban jao."},
        ]
    else:
        memes = [
            {"emoji": "😊", "text": "Chal raha hai... but aur bachao yaar."},
            {"emoji": "📊", "text": "Steady kharcha — but savings rate improve karna hai."},
        ]

    # Category-specific meme
    if top_cat:
        cat, amt = top_cat
        if cat.lower() == "food" and amt > 5000:
            memes.append({"emoji": "🍕", "text": f"Food pe ₹{int(amt)}! Kitchen kis din se band hai?"})
        if cat.lower() == "shopping" and amt > 3000:
            memes.append({"emoji": "🛍️", "text": f"Shopping pe ₹{int(amt)}! Amazon ke shareholder ban rahe ho."})
        if cat.lower() == "entertainment" and amt > 2000:
            memes.append({"emoji": "🎬", "text": f"Entertainment pe ₹{int(amt)}! Netflix + Prime + Hotstar sab liya hai kya?"})
        if cat.lower() == "transport" and amt > 4000:
            memes.append({"emoji": "🚗", "text": f"Transport ₹{int(amt)} — Uber ka VIP customer banoge."})

    chosen = random.choice(memes) if memes else {"emoji": "💡", "text": "Track your money, master your life!"}
    return chosen


# ----- Voice Parse (accepts spoken transaction, returns structured) -----
class VoiceParseIn(BaseModel):
    text: str


@api.post("/voice/parse-transaction")
async def voice_parse_transaction(body: VoiceParseIn, user=Depends(get_current_user)):
    """
    Parse spoken/typed text like "500 rupaye zomato pe" into a transaction dict.
    Uses regex first, LLM as fallback.
    """
    import re
    text = body.text.strip().lower()
    if not text:
        raise HTTPException(status_code=400, detail="Empty text")

    # Regex: try to extract amount
    m = re.search(r"(\d+(?:\.\d+)?)\s*(?:rupaye|rupees|rs\.?|₹|inr)?", text)
    amount = float(m.group(1)) if m else None

    # Detect income keywords
    income_kw = ["mila", "aaya", "salary", "earned", "received", "credit", "income", "bonus"]
    is_income = any(k in text for k in income_kw)

    # Category detection (simple keyword mapping)
    cat_map = {
        "Food": ["zomato", "swiggy", "dominos", "khana", "food", "restaurant", "cafe", "bhojan", "lunch", "dinner", "breakfast"],
        "Groceries": ["dmart", "bigbasket", "grocery", "sabzi", "vegetable", "kirana"],
        "Transport": ["uber", "ola", "petrol", "diesel", "cab", "auto", "rickshaw", "metro", "bus", "train"],
        "Shopping": ["amazon", "flipkart", "myntra", "shopping", "kapde", "clothes", "meesho"],
        "Bills": ["bill", "electricity", "recharge", "airtel", "jio", "vi", "gas", "water", "internet"],
        "Entertainment": ["netflix", "prime", "hotstar", "movie", "cinema", "spotify"],
        "Health": ["medicine", "doctor", "hospital", "pharmacy", "medical"],
        "Salary": ["salary", "vetan", "tankha"],
    }
    detected_cat = None
    for cat, keywords in cat_map.items():
        if any(k in text for k in keywords):
            detected_cat = cat
            break

    if not detected_cat:
        detected_cat = "Other" if not is_income else "Other Income"

    if amount is None:
        # Try LLM fallback
        llm_prompt = (
            "Extract transaction details from this Hinglish text. Return ONLY valid JSON with keys: "
            "amount (number), type ('income' or 'expense'), category, merchant, note. "
            f"Text: {body.text}"
        )
        try:
            out = await llm_json_call(
                system_msg="You are a finance transaction parser. Return only JSON.",
                user_msg=llm_prompt,
                session_id=f"voice-{user['id']}",
            )
            if out:
                import json as _json
                # extract JSON block
                jm = re.search(r"\{[\s\S]*\}", out)
                if jm:
                    parsed = _json.loads(jm.group(0))
                    return {
                        "amount": float(parsed.get("amount") or 0),
                        "type": parsed.get("type", "expense"),
                        "category": parsed.get("category", "Other"),
                        "note": parsed.get("note") or parsed.get("merchant", ""),
                        "confidence": "llm",
                    }
        except Exception as e:
            logging.warning("voice LLM parse failed: %s", e)
        raise HTTPException(status_code=400, detail="Amount detect nahi hua. Fir se boliye ya type kariye.")

    # Extract note (words minus category keywords)
    note = body.text
    return {
        "amount": amount,
        "type": "income" if is_income else "expense",
        "category": detected_cat,
        "note": note,
        "confidence": "regex",
    }


# ----- Health -----
@api.get("/")
async def root():
    return {"app": "Apka Munim", "status": "ok"}


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
    await db.goals.create_index([("owner_id", 1)])
    await db.subscriptions.create_index([("owner_id", 1), ("next_billing_date", 1)])
    await db.password_reset_tokens.create_index("token", unique=True)
    await db.password_reset_tokens.create_index("expires_at")
    await db.pin_attempts.create_index("email", unique=True)
    logger.info("Apka Munim API started")


@app.on_event("shutdown")
async def shutdown():
    client.close()
