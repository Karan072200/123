"""
Accounting Reports router — Phase 5 (partial: read-only reports on top of
existing transactions + invoices + bank_payments + udhaar collections).

Endpoints (all mounted under /api/reports):
    /trial-balance    GET  ?from=&to=  — chart-of-accounts style summary
    /day-book         GET  ?date=      — all vouchers for a single day
    /cash-book        GET  ?from=&to=  — cash-only movements
    /pnl              GET  ?from=&to=  — Profit & Loss (Sales - Purchase - Expense)
    /balance-sheet    GET  ?as_of=     — Assets / Liabilities / Equity snapshot
    /gstr-1           GET  ?month=YYYY-MM  — outward supplies (from invoices)
    /gstr-3b          GET  ?month=YYYY-MM  — summary + tax liability

These are AGGREGATIONS over data the app already stores. They add no
new writes and cannot break existing features.
"""
from __future__ import annotations

from datetime import datetime, timezone, date
from typing import Optional
from fastapi import APIRouter, Depends, Query

from server import db, get_current_user, scope  # noqa: E402


router = APIRouter(prefix="/api/reports", tags=["reports"])


# =========================================================================
#                              HELPERS
# =========================================================================

def _dt(iso: Optional[str]) -> Optional[str]:
    """Normalize any 'YYYY-MM-DD' or ISO to 'YYYY-MM-DD' for string compare."""
    if not iso:
        return None
    try:
        return datetime.fromisoformat(iso.replace("Z", "+00:00")).date().isoformat()
    except Exception:
        try:
            return date.fromisoformat(iso[:10]).isoformat()
        except Exception:
            return None


def _date_filter(field: str, frm: Optional[str], to: Optional[str]) -> dict:
    q: dict = {}
    if frm:
        q["$gte"] = frm
    if to:
        q["$lte"] = to
    return {field: q} if q else {}


async def _sum_field(coll: str, match: dict, field: str) -> float:
    pipeline = [
        {"$match": match},
        {"$group": {"_id": None, "s": {"$sum": f"${field}"}}},
    ]
    async for row in db[coll].aggregate(pipeline):
        return round(float(row.get("s") or 0.0), 2)
    return 0.0


# =========================================================================
#                              TRIAL BALANCE
# =========================================================================

@router.get("/trial-balance")
async def trial_balance(
    frm: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    """Simplified Trial Balance grouped by account/category.

    Debit side  = expense categories + party dues (customers owe us)
    Credit side = income categories + party payables (we owe suppliers)
    """
    frm, to = _dt(frm), _dt(to)
    q = scope(user)

    # Transactions: group by category, income vs expense
    tx_match: dict = {**q}
    if frm or to:
        tx_match.update(_date_filter("date", frm, to))

    debit_rows: list = []
    credit_rows: list = []

    pipeline = [
        {"$match": tx_match},
        {"$group": {
            "_id": {"type": "$type", "category": "$category"},
            "amount": {"$sum": "$amount"},
        }},
    ]
    async for row in db.transactions.aggregate(pipeline):
        cat = row["_id"].get("category") or "Uncategorized"
        typ = row["_id"].get("type", "expense")
        amt = round(float(row.get("amount") or 0.0), 2)
        if typ == "income":
            credit_rows.append({"account": f"Income · {cat}", "amount": amt})
        else:
            debit_rows.append({"account": f"Expense · {cat}", "amount": amt})

    # Invoices → Sales side
    inv_match: dict = {**q, "type": {"$in": ["invoice", "tax-invoice", "gst-invoice", "retail-invoice", None]}}
    if frm or to:
        inv_match.update(_date_filter("date", frm, to))
    sales_total = await _sum_field("invoices", inv_match, "grand_total")
    if sales_total:
        credit_rows.append({"account": "Sales", "amount": sales_total})

    # Purchase Bills → Purchase side
    pur_match: dict = {**q, "type": "purchase"}
    if frm or to:
        pur_match.update(_date_filter("date", frm, to))
    purchase_total = await _sum_field("invoices", pur_match, "grand_total")
    if purchase_total:
        debit_rows.append({"account": "Purchases", "amount": purchase_total})

    # Bank Payments — receipts (credit) & payments (debit)
    bp_match: dict = {**q}
    if frm or to:
        bp_match.update(_date_filter("date", frm, to))
    receipts = await _sum_field("bank_payments", {**bp_match, "direction": "in"}, "amount")
    payments = await _sum_field("bank_payments", {**bp_match, "direction": "out"}, "amount")
    if receipts:
        debit_rows.append({"account": "Bank · Receipts", "amount": receipts})
    if payments:
        credit_rows.append({"account": "Bank · Payments", "amount": payments})

    debit_total = round(sum(r["amount"] for r in debit_rows), 2)
    credit_total = round(sum(r["amount"] for r in credit_rows), 2)

    return {
        "from": frm,
        "to": to,
        "debit_rows": sorted(debit_rows, key=lambda r: -r["amount"]),
        "credit_rows": sorted(credit_rows, key=lambda r: -r["amount"]),
        "debit_total": debit_total,
        "credit_total": credit_total,
        "difference": round(debit_total - credit_total, 2),
    }


# =========================================================================
#                              DAY BOOK
# =========================================================================

@router.get("/day-book")
async def day_book(
    on: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    """All vouchers (transactions, invoices, payments) for a single day."""
    day = _dt(on) or datetime.now(timezone.utc).date().isoformat()
    q = scope(user)

    tx_cursor = db.transactions.find({**q, "date": day}, {"_id": 0}).sort("date", 1)
    inv_cursor = db.invoices.find({**q, "date": day}, {"_id": 0}).sort("date", 1)
    bp_cursor = db.bank_payments.find({**q, "date": day}, {"_id": 0}).sort("date", 1)

    txns = await tx_cursor.to_list(500)
    invs = await inv_cursor.to_list(500)
    bps = await bp_cursor.to_list(500)

    return {
        "date": day,
        "transactions": txns,
        "invoices": invs,
        "bank_payments": bps,
        "counts": {
            "transactions": len(txns),
            "invoices": len(invs),
            "bank_payments": len(bps),
        },
    }


# =========================================================================
#                              CASH BOOK
# =========================================================================

@router.get("/cash-book")
async def cash_book(
    frm: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    """Cash-only receipts and payments.

    Looks at transactions where `payment_mode` == 'cash' (with fallback for
    docs that don't have the field — those are treated as cash for backward
    compatibility).
    """
    frm, to = _dt(frm), _dt(to)
    q = scope(user)
    if frm or to:
        q.update(_date_filter("date", frm, to))

    cash_match = {**q, "$or": [{"payment_mode": "cash"}, {"payment_mode": {"$exists": False}}]}
    cursor = db.transactions.find(cash_match, {"_id": 0}).sort("date", 1)
    rows = await cursor.to_list(5000)

    receipts = sum(float(r.get("amount") or 0) for r in rows if r.get("type") == "income")
    payments = sum(float(r.get("amount") or 0) for r in rows if r.get("type") != "income")

    return {
        "from": frm,
        "to": to,
        "rows": rows,
        "total_receipts": round(receipts, 2),
        "total_payments": round(payments, 2),
        "closing_balance": round(receipts - payments, 2),
    }


# =========================================================================
#                              PROFIT & LOSS
# =========================================================================

@router.get("/pnl")
async def profit_loss(
    frm: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    frm, to = _dt(frm), _dt(to)
    q = scope(user)
    tx_match: dict = {**q}
    if frm or to:
        tx_match.update(_date_filter("date", frm, to))

    inv_match: dict = {**q, "type": {"$nin": ["purchase", "purchase-order", "debit-note"]}}
    if frm or to:
        inv_match.update(_date_filter("date", frm, to))
    pur_match: dict = {**q, "type": {"$in": ["purchase", "purchase-order"]}}
    if frm or to:
        pur_match.update(_date_filter("date", frm, to))

    sales = await _sum_field("invoices", inv_match, "grand_total")
    purchases = await _sum_field("invoices", pur_match, "grand_total")

    # Transactions: split by type
    income_pipe = [
        {"$match": {**tx_match, "type": "income"}},
        {"$group": {"_id": "$category", "s": {"$sum": "$amount"}}},
    ]
    expense_pipe = [
        {"$match": {**tx_match, "type": {"$ne": "income"}}},
        {"$group": {"_id": "$category", "s": {"$sum": "$amount"}}},
    ]

    other_income: list = []
    async for r in db.transactions.aggregate(income_pipe):
        other_income.append({"category": r["_id"] or "Uncategorized", "amount": round(float(r["s"] or 0), 2)})

    expenses: list = []
    async for r in db.transactions.aggregate(expense_pipe):
        expenses.append({"category": r["_id"] or "Uncategorized", "amount": round(float(r["s"] or 0), 2)})

    total_income = round(sales + sum(x["amount"] for x in other_income), 2)
    total_expense = round(purchases + sum(x["amount"] for x in expenses), 2)
    gross_profit = round(sales - purchases, 2)
    net_profit = round(total_income - total_expense, 2)

    return {
        "from": frm,
        "to": to,
        "sales": sales,
        "purchases": purchases,
        "gross_profit": gross_profit,
        "other_income": sorted(other_income, key=lambda x: -x["amount"]),
        "expenses": sorted(expenses, key=lambda x: -x["amount"]),
        "total_income": total_income,
        "total_expense": total_expense,
        "net_profit": net_profit,
    }


# =========================================================================
#                              BALANCE SHEET
# =========================================================================

@router.get("/balance-sheet")
async def balance_sheet(
    as_of: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    """Simplified snapshot Balance Sheet as of a date.

    Assets      = Cash + Bank balance + Sundry Debtors (customer dues)
    Liabilities = Sundry Creditors (supplier dues)
    Equity      = Assets − Liabilities (opening cap + retained earnings collapsed)
    """
    cutoff = _dt(as_of) or datetime.now(timezone.utc).date().isoformat()
    q = scope(user)

    # Cash / Bank balances from accounts collection
    accts = await db.accounts.find(q, {"_id": 0}).to_list(500)
    cash_balance = sum(float(a.get("balance") or 0) for a in accts if (a.get("type") or "").lower() in ("cash", "wallet"))
    bank_balance = sum(float(a.get("balance") or 0) for a in accts if (a.get("type") or "").lower() not in ("cash", "wallet"))

    # Sundry Debtors — udhaar entries where direction/type is "lene" (they owe us)
    udhaar = await db.udhaar.find({**q, "date": {"$lte": cutoff}}, {"_id": 0}).to_list(10000)
    debtors = sum(
        float(u.get("amount") or 0)
        for u in udhaar
        if (u.get("type") or u.get("direction") or "").lower() in ("lene", "receivable", "in")
        and not u.get("settled")
    )
    creditors = sum(
        float(u.get("amount") or 0)
        for u in udhaar
        if (u.get("type") or u.get("direction") or "").lower() in ("dene", "payable", "out")
        and not u.get("settled")
    )

    # Unpaid invoice balance (sales side)
    inv_unpaid_pipe = [
        {"$match": {**q, "date": {"$lte": cutoff}, "status": {"$in": ["unpaid", "partial"]}}},
        {"$group": {"_id": None, "due": {"$sum": {"$ifNull": ["$balance_due", "$grand_total"]}}}},
    ]
    inv_due = 0.0
    async for r in db.invoices.aggregate(inv_unpaid_pipe):
        inv_due = round(float(r.get("due") or 0), 2)
    debtors += inv_due

    assets = round(cash_balance + bank_balance + debtors, 2)
    liabilities = round(creditors, 2)
    equity = round(assets - liabilities, 2)

    return {
        "as_of": cutoff,
        "assets": {
            "cash": round(cash_balance, 2),
            "bank": round(bank_balance, 2),
            "sundry_debtors": round(debtors, 2),
            "total": assets,
        },
        "liabilities": {
            "sundry_creditors": round(creditors, 2),
            "total": liabilities,
        },
        "equity": equity,
    }


# =========================================================================
#                              GSTR-1  (outward supplies)
# =========================================================================

@router.get("/gstr-1")
async def gstr_1(
    month: Optional[str] = None,  # 'YYYY-MM'
    user: dict = Depends(get_current_user),
):
    if not month:
        month = datetime.now(timezone.utc).strftime("%Y-%m")
    q = {**scope(user), "date": {"$regex": f"^{month}"}, "type": {"$nin": ["purchase", "purchase-order"]}}

    invoices = await db.invoices.find(q, {"_id": 0}).to_list(10000)

    b2b: list = []  # party has GSTIN
    b2c: list = []  # no GSTIN
    for inv in invoices:
        row = {
            "invoice_number": inv.get("invoice_number"),
            "date": inv.get("date"),
            "party_name": inv.get("party_name") or inv.get("customer_name"),
            "gstin": inv.get("party_gstin") or inv.get("customer_gstin"),
            "taxable_value": round(float(inv.get("subtotal") or 0), 2),
            "cgst": round(float(inv.get("cgst") or 0), 2),
            "sgst": round(float(inv.get("sgst") or 0), 2),
            "igst": round(float(inv.get("igst") or 0), 2),
            "grand_total": round(float(inv.get("grand_total") or 0), 2),
        }
        if row["gstin"]:
            b2b.append(row)
        else:
            b2c.append(row)

    def _totals(rows: list) -> dict:
        return {
            "count": len(rows),
            "taxable_value": round(sum(r["taxable_value"] for r in rows), 2),
            "cgst": round(sum(r["cgst"] for r in rows), 2),
            "sgst": round(sum(r["sgst"] for r in rows), 2),
            "igst": round(sum(r["igst"] for r in rows), 2),
            "grand_total": round(sum(r["grand_total"] for r in rows), 2),
        }

    return {
        "month": month,
        "b2b": b2b,
        "b2c": b2c,
        "totals": {"b2b": _totals(b2b), "b2c": _totals(b2c), "all": _totals(b2b + b2c)},
    }


# =========================================================================
#                              GSTR-3B (summary)
# =========================================================================

@router.get("/gstr-3b")
async def gstr_3b(
    month: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    if not month:
        month = datetime.now(timezone.utc).strftime("%Y-%m")
    q_out = {**scope(user), "date": {"$regex": f"^{month}"}, "type": {"$nin": ["purchase", "purchase-order"]}}
    q_in = {**scope(user), "date": {"$regex": f"^{month}"}, "type": {"$in": ["purchase", "purchase-order"]}}

    outward = await db.invoices.find(q_out, {"_id": 0}).to_list(10000)
    inward = await db.invoices.find(q_in, {"_id": 0}).to_list(10000)

    def _agg(rows: list) -> dict:
        return {
            "taxable_value": round(sum(float(r.get("subtotal") or 0) for r in rows), 2),
            "cgst": round(sum(float(r.get("cgst") or 0) for r in rows), 2),
            "sgst": round(sum(float(r.get("sgst") or 0) for r in rows), 2),
            "igst": round(sum(float(r.get("igst") or 0) for r in rows), 2),
        }

    out_a = _agg(outward)
    in_a = _agg(inward)
    net_tax_liability = round(
        (out_a["cgst"] + out_a["sgst"] + out_a["igst"])
        - (in_a["cgst"] + in_a["sgst"] + in_a["igst"]),
        2,
    )

    return {
        "month": month,
        "outward": out_a,
        "inward_itc": in_a,
        "net_tax_liability": net_tax_liability,
    }
