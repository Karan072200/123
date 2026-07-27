"""
Billing Module — Apka Munim
============================
Products, Inventory, Purchase Entry, Sales Invoice — completely separate
from the Money module UI, but AUTO-SYNCS into transactions/udhaar so the
shopkeeper never has to enter anything twice.

HOW TO PLUG THIS IN (server.py mein 2 lines add karo):

    1. Existing imports ke baad (jaha "api = APIRouter(prefix='/api')" likha hai
       uske ЅAATH hi, us line ke just niche) add karo:

           from billing import billing_router, ensure_default_products_indexes

       Note: billing.py ko "get_current_user", "scope", "db" import karne ke liye
       server.py se hi import karna hai (circular import na ho iske liye billing.py
       khud in cheezo ko server module se import karta hai — neeche dekho).

    2. Router ko app mein include karo — jaha "app.include_router(api)" ya
       jahan bhi api router already app mein add ho raha hai (file ke end ke
       aas paas dhundo, ya agar sirf "app.include_router(api)" line nahi mili
       to seedha "app = FastAPI(...)" ke thodi der baad, sabse last route ke
       just pehle) add karo:

           app.include_router(billing_router)

    Bas. Koi aur cheez change nahi karni. Products/Purchases/Invoices apne aap
    naye MongoDB collections (products, purchases, invoices) use karenge.
"""

import io
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Literal

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

# Reuse everything from the main server module — no duplication, no drift.
from server import db, get_current_user, scope

billing_router = APIRouter(prefix="/api/billing", tags=["billing"])


async def ensure_default_products_indexes():
    """Call once at startup if you want indexes (optional, safe to skip)."""
    try:
        await db.products.create_index("owner_id")
        await db.purchases.create_index("owner_id")
        await db.invoices.create_index("owner_id")
    except Exception:
        pass


# ================= MODELS =================

class ProductIn(BaseModel):
    name: str
    sku: Optional[str] = ""
    category: Optional[str] = "General"
    purchase_price: float = 0.0
    selling_price: float = 0.0
    gst_percent: float = 0.0
    stock_qty: float = 0.0
    low_stock_alert: float = 5.0


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    category: Optional[str] = None
    purchase_price: Optional[float] = None
    selling_price: Optional[float] = None
    gst_percent: Optional[float] = None
    low_stock_alert: Optional[float] = None


PaymentMode = Literal["cash", "bank", "upi", "credit"]


class PurchaseItemIn(BaseModel):
    product_id: str
    quantity: float
    purchase_price: float
    gst_percent: float = 0.0


class PurchaseIn(BaseModel):
    supplier_name: str
    supplier_phone: Optional[str] = ""
    items: List[PurchaseItemIn]
    payment_mode: PaymentMode
    account_id: Optional[str] = None   # required unless payment_mode == credit
    due_date: Optional[str] = None     # used only when payment_mode == credit
    note: Optional[str] = ""


class SaleItemIn(BaseModel):
    product_id: str
    quantity: float
    unit_price: Optional[float] = None   # defaults to product.selling_price
    gst_percent: Optional[float] = None  # defaults to product.gst_percent


class SaleInvoiceIn(BaseModel):
    customer_name: str
    customer_phone: Optional[str] = ""
    items: List[SaleItemIn]
    discount: float = 0.0
    payment_mode: PaymentMode
    account_id: Optional[str] = None
    due_date: Optional[str] = None
    invoice_type: Literal["gst_invoice", "tax_invoice", "quotation", "delivery_challan"] = "tax_invoice"
    note: Optional[str] = ""


# ================= PRODUCTS =================

@billing_router.get("/products")
async def list_products(user=Depends(get_current_user)):
    rows = await db.products.find(scope(user), {"_id": 0}).sort("name", 1).to_list(2000)
    return rows


@billing_router.post("/products")
async def create_product(body: ProductIn, user=Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "owner_id": user["current_ledger_id"],
        **body.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.products.insert_one(doc)
    doc.pop("_id", None)
    return doc


@billing_router.patch("/products/{product_id}")
async def update_product(product_id: str, body: ProductUpdate, user=Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        return {"ok": True}
    await db.products.update_one(
        {"id": product_id, "owner_id": user["current_ledger_id"]}, {"$set": updates}
    )
    return {"ok": True}


@billing_router.delete("/products/{product_id}")
async def delete_product(product_id: str, user=Depends(get_current_user)):
    await db.products.delete_one({"id": product_id, "owner_id": user["current_ledger_id"]})
    return {"ok": True}


# ================= INVENTORY =================

@billing_router.get("/inventory")
async def inventory_overview(user=Depends(get_current_user)):
    products = await db.products.find(scope(user), {"_id": 0}).to_list(2000)
    low_stock = [p for p in products if p["stock_qty"] <= p.get("low_stock_alert", 5)]
    total_value = sum(p["stock_qty"] * p.get("purchase_price", 0) for p in products)
    return {
        "products": products,
        "low_stock": low_stock,
        "total_stock_value": round(total_value, 2),
    }


# ================= HELPERS (auto-sync) =================

async def _resolve_account(user, account_id: Optional[str], payment_mode: str):
    if payment_mode == "credit":
        return None
    if not account_id:
        raise HTTPException(status_code=400, detail="account_id zaroori hai jab payment credit na ho")
    acc = await db.accounts.find_one({"id": account_id, "owner_id": user["current_ledger_id"]})
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")
    return acc


async def _create_money_transaction(user, account: dict, txn_type: str, amount: float, category: str, note: str):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "owner_id": user["current_ledger_id"],
        "account_id": account["id"],
        "account_name": account["name"],
        "type": txn_type,
        "amount": float(amount),
        "category": category,
        "note": note,
        "date": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.transactions.insert_one(doc)
    doc.pop("_id", None)
    return doc


async def _create_udhaar_entry(user, person_name: str, phone: str, udhaar_type: str, amount: float, note: str, due_date: Optional[str]):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "owner_id": user["current_ledger_id"],
        "person_name": person_name,
        "phone": phone or "",
        "type": udhaar_type,   # "lene" (receivable) or "dene" (payable)
        "amount": float(amount),
        "note": note or "",
        "due_date": due_date or "",
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.udhaar.insert_one(doc)
    doc.pop("_id", None)
    return doc


# ================= PURCHASE ENTRY =================

@billing_router.get("/purchases")
async def list_purchases(user=Depends(get_current_user)):
    rows = await db.purchases.find(scope(user), {"_id": 0}).sort("created_at", -1).to_list(500)
    return rows


@billing_router.post("/purchase")
async def create_purchase(body: PurchaseIn, user=Depends(get_current_user)):
    """
    Ek entry -> Inventory + -> Expense (agar cash/bank/upi) ya Supplier Udhaar (agar credit).
    """
    account = await _resolve_account(user, body.account_id, body.payment_mode)

    total = 0.0
    line_items = []
    for item in body.items:
        product = await db.products.find_one(
            {"id": item.product_id, "owner_id": user["current_ledger_id"]}
        )
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")

        gst_amount = item.purchase_price * item.quantity * (item.gst_percent / 100)
        line_total = item.purchase_price * item.quantity + gst_amount
        total += line_total
        line_items.append({
            "product_id": item.product_id,
            "product_name": product["name"],
            "quantity": item.quantity,
            "purchase_price": item.purchase_price,
            "gst_percent": item.gst_percent,
            "line_total": round(line_total, 2),
        })

        # Inventory +
        await db.products.update_one(
            {"id": item.product_id, "owner_id": user["current_ledger_id"]},
            {"$inc": {"stock_qty": item.quantity}},
        )

    purchase_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "owner_id": user["current_ledger_id"],
        "supplier_name": body.supplier_name,
        "supplier_phone": body.supplier_phone or "",
        "items": line_items,
        "total": round(total, 2),
        "payment_mode": body.payment_mode,
        "note": body.note or "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    if body.payment_mode == "credit":
        udhaar = await _create_udhaar_entry(
            user, body.supplier_name, body.supplier_phone or "", "dene",
            total, f"Purchase — {body.note or body.supplier_name}", body.due_date,
        )
        purchase_doc["udhaar_id"] = udhaar["id"]
    else:
        txn = await _create_money_transaction(
            user, account, "expense", total, "Purchase",
            f"Purchase from {body.supplier_name}",
        )
        purchase_doc["transaction_id"] = txn["id"]

    await db.purchases.insert_one(purchase_doc)
    purchase_doc.pop("_id", None)
    return purchase_doc


# ================= SALES INVOICE =================

@billing_router.get("/invoices")
async def list_invoices(user=Depends(get_current_user)):
    rows = await db.invoices.find(scope(user), {"_id": 0}).sort("created_at", -1).to_list(500)
    return rows


@billing_router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, user=Depends(get_current_user)):
    inv = await db.invoices.find_one(
        {"id": invoice_id, "owner_id": user["current_ledger_id"]}, {"_id": 0}
    )
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return inv


@billing_router.post("/invoice")
async def create_invoice(body: SaleInvoiceIn, user=Depends(get_current_user)):
    """
    Ek entry -> Inventory - -> Income (agar cash/bank/upi) ya Customer Udhaar (agar credit).
    """
    account = await _resolve_account(user, body.account_id, body.payment_mode)

    subtotal = 0.0
    gst_total = 0.0
    line_items = []
    for item in body.items:
        product = await db.products.find_one(
            {"id": item.product_id, "owner_id": user["current_ledger_id"]}
        )
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        if product["stock_qty"] < item.quantity:
            raise HTTPException(status_code=400, detail=f"{product['name']} mein stock kam hai")

        unit_price = item.unit_price if item.unit_price is not None else product["selling_price"]
        gst_percent = item.gst_percent if item.gst_percent is not None else product.get("gst_percent", 0.0)

        line_subtotal = unit_price * item.quantity
        gst_amount = line_subtotal * (gst_percent / 100)
        subtotal += line_subtotal
        gst_total += gst_amount

        line_items.append({
            "product_id": item.product_id,
            "product_name": product["name"],
            "quantity": item.quantity,
            "unit_price": unit_price,
            "gst_percent": gst_percent,
            "line_total": round(line_subtotal + gst_amount, 2),
        })

        # Inventory -
        await db.products.update_one(
            {"id": item.product_id, "owner_id": user["current_ledger_id"]},
            {"$inc": {"stock_qty": -item.quantity}},
        )

    grand_total = round(subtotal + gst_total - body.discount, 2)

    invoice_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "owner_id": user["current_ledger_id"],
        "invoice_no": f"INV-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}",
        "invoice_type": body.invoice_type,
        "customer_name": body.customer_name,
        "customer_phone": body.customer_phone or "",
        "items": line_items,
        "subtotal": round(subtotal, 2),
        "gst_total": round(gst_total, 2),
        "discount": body.discount,
        "total": grand_total,
        "payment_mode": body.payment_mode,
        "note": body.note or "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    if body.payment_mode == "credit":
        udhaar = await _create_udhaar_entry(
            user, body.customer_name, body.customer_phone or "", "lene",
            grand_total, f"Invoice {invoice_doc['invoice_no']}", body.due_date,
        )
        invoice_doc["udhaar_id"] = udhaar["id"]
    else:
        txn = await _create_money_transaction(
            user, account, "income", grand_total, "Sales",
            f"Invoice {invoice_doc['invoice_no']} — {body.customer_name}",
        )
        invoice_doc["transaction_id"] = txn["id"]

    await db.invoices.insert_one(invoice_doc)
    invoice_doc.pop("_id", None)
    return invoice_doc


@billing_router.get("/invoices/{invoice_id}/pdf")
async def invoice_pdf(invoice_id: str, user=Depends(get_current_user)):
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

    inv = await db.invoices.find_one(
        {"id": invoice_id, "owner_id": user["current_ledger_id"]}, {"_id": 0}
    )
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=1.6 * cm, rightMargin=1.6 * cm,
                             topMargin=1.6 * cm, bottomMargin=1.6 * cm,
                             title=f"Invoice {inv['invoice_no']}")
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="TitleBig", fontSize=20, textColor=colors.HexColor("#2A4F4F"), spaceAfter=4))
    styles.add(ParagraphStyle(name="Sub", fontSize=10, textColor=colors.HexColor("#57534E"), spaceAfter=12))

    story = [
        Paragraph("Apka Munim", styles["TitleBig"]),
        Paragraph(f"{inv['invoice_type'].replace('_', ' ').title()} &middot; {inv['invoice_no']}", styles["Sub"]),
        Paragraph(f"Customer: {inv['customer_name']} &middot; {inv.get('customer_phone', '')}", styles["Sub"]),
        Spacer(1, 8),
    ]

    table_data = [["Product", "Qty", "Unit Price", "GST %", "Line Total"]]
    for it in inv["items"]:
        table_data.append([
            it["product_name"], str(it["quantity"]),
            f"Rs. {it['unit_price']}", f"{it['gst_percent']}%",
            f"Rs. {it['line_total']}",
        ])
    table = Table(table_data, colWidths=[6 * cm, 2 * cm, 3 * cm, 2.5 * cm, 3 * cm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2A4F4F")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D6D3CE")),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
    ]))
    story.append(table)
    story.append(Spacer(1, 10))
    story.append(Paragraph(f"Subtotal: Rs. {inv['subtotal']}", styles["Sub"]))
    story.append(Paragraph(f"GST: Rs. {inv['gst_total']}", styles["Sub"]))
    story.append(Paragraph(f"Discount: Rs. {inv['discount']}", styles["Sub"]))
    story.append(Paragraph(f"<b>Total: Rs. {inv['total']}</b>", styles["Sub"]))
    story.append(Paragraph(f"Payment Mode: {inv['payment_mode'].upper()}", styles["Sub"]))

    doc.build(story)
    buf.seek(0)
    return StreamingResponse(
        buf, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={inv['invoice_no']}.pdf"},
    )
