"""
Multi-Warehouse + Batch / Serial + Stock Transfer router — Phase 7.

Adds a warehouse dimension on top of the existing products collection
without breaking the current single-stock model:

    Warehouse            — physical location (name, address, is_default)
    StockLevel           — per-warehouse per-product-per-batch quantity
    Batch                — batch/lot with mfg + expiry date
    Serial               — serial numbers for high-value items
    StockTransfer        — movement between warehouses (draft → in-transit → received)
    StockAdjustment      — one-off increase/decrease with reason

Endpoints (mounted under /api/warehouses/*):
    /                       GET, POST     PUT/DELETE /{id}
    /stock                  GET           — current levels across warehouses
    /stock/adjust           POST          — manual adjustment
    /batches                GET, POST     DELETE /{id}
    /serials                GET, POST     PUT/DELETE /{id}
    /transfers              GET, POST     GET/PUT/DELETE /{id}
    /transfers/{id}/receive POST          — mark received, updates stock levels
"""
from __future__ import annotations

from typing import List, Optional, Literal
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from deps import db, get_current_user, scope, now_iso, new_id, audit_log, sanitize


router = APIRouter(prefix="/api/warehouses", tags=["warehouses"])


# =========================================================================
#                              MODELS
# =========================================================================

class WarehouseIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    code: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = Field(None, max_length=300)
    city: Optional[str] = Field(None, max_length=50)
    state: Optional[str] = Field(None, max_length=50)
    is_default: bool = False
    manager: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    notes: Optional[str] = Field(None, max_length=500)


class BatchIn(BaseModel):
    product_id: str
    product_name: Optional[str] = Field(None, max_length=100)
    batch_no: str = Field(..., min_length=1, max_length=50)
    mfg_date: Optional[str] = None
    expiry_date: Optional[str] = None
    warehouse_id: Optional[str] = None
    initial_qty: float = Field(0.0, ge=0)
    rate: float = Field(0.0, ge=0)
    notes: Optional[str] = None


class SerialIn(BaseModel):
    product_id: str
    product_name: Optional[str] = Field(None, max_length=100)
    serial_no: str = Field(..., min_length=1, max_length=100)
    warehouse_id: Optional[str] = None
    batch_id: Optional[str] = None
    status: Literal["in_stock", "sold", "returned", "damaged"] = "in_stock"
    sold_to_party_id: Optional[str] = None
    invoice_id: Optional[str] = None
    notes: Optional[str] = None


class StockAdjustIn(BaseModel):
    warehouse_id: str
    product_id: str
    product_name: Optional[str] = None
    batch_id: Optional[str] = None
    qty_delta: float  # can be positive or negative
    reason: str = Field(..., max_length=200)


class TransferLine(BaseModel):
    product_id: str
    product_name: Optional[str] = None
    batch_id: Optional[str] = None
    qty: float = Field(..., gt=0)
    rate: float = Field(0.0, ge=0)


class TransferIn(BaseModel):
    from_warehouse_id: str
    to_warehouse_id: str
    transfer_date: str
    expected_date: Optional[str] = None
    lines: List[TransferLine] = Field(..., min_length=1, max_length=200)
    notes: Optional[str] = None


# =========================================================================
#                              HELPERS
# =========================================================================

async def _get_default_warehouse_id(owner_id: str) -> Optional[str]:
    doc = await db.warehouses.find_one({"owner_id": owner_id, "is_default": True})
    if doc:
        return doc["id"]
    doc = await db.warehouses.find_one({"owner_id": owner_id})
    return doc["id"] if doc else None


async def _adjust_stock_level(owner_id: str, warehouse_id: str, product_id: str, batch_id: Optional[str], qty_delta: float):
    """Atomic upsert on the (warehouse, product, batch) stock level."""
    key = {"owner_id": owner_id, "warehouse_id": warehouse_id, "product_id": product_id, "batch_id": batch_id}
    await db.stock_levels.update_one(
        key,
        {"$inc": {"qty": qty_delta}, "$setOnInsert": {"id": new_id("sl_"), **key}, "$set": {"updated_at": now_iso()}},
        upsert=True,
    )


# =========================================================================
#                              WAREHOUSE CRUD
# =========================================================================

@router.get("")
async def list_warehouses(user: dict = Depends(get_current_user)):
    q = scope(user)
    items = await db.warehouses.find(q, {"_id": 0}).sort("name", 1).to_list(500)
    return {"items": items, "total": len(items)}


@router.post("")
async def create_warehouse(body: WarehouseIn, user: dict = Depends(get_current_user)):
    owner = user["current_ledger_id"]
    # If this is being set as default, unset previous defaults
    if body.is_default:
        await db.warehouses.update_many({"owner_id": owner, "is_default": True}, {"$set": {"is_default": False}})
    doc = {
        **body.model_dump(),
        "id": new_id("wh_"),
        "owner_id": owner,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.warehouses.insert_one(doc)
    await audit_log(user=user, action="create", entity_type="warehouse", entity_id=doc["id"], after=doc)
    return sanitize(doc)


@router.put("/{wh_id}")
async def update_warehouse(wh_id: str, body: WarehouseIn, user: dict = Depends(get_current_user)):
    owner = user["current_ledger_id"]
    before = await db.warehouses.find_one({"id": wh_id, "owner_id": owner}, {"_id": 0})
    if not before:
        raise HTTPException(404, "Warehouse not found")
    if body.is_default:
        await db.warehouses.update_many(
            {"owner_id": owner, "is_default": True, "id": {"$ne": wh_id}},
            {"$set": {"is_default": False}},
        )
    result = await db.warehouses.find_one_and_update(
        {"id": wh_id, "owner_id": owner},
        {"$set": {**body.model_dump(), "updated_at": now_iso()}},
        return_document=True,
    )
    await audit_log(user=user, action="update", entity_type="warehouse", entity_id=wh_id, before=before, after=result)
    return sanitize(result)


@router.delete("/{wh_id}")
async def delete_warehouse(wh_id: str, user: dict = Depends(get_current_user)):
    # Refuse if warehouse has stock
    lvl = await db.stock_levels.find_one({"owner_id": user["current_ledger_id"], "warehouse_id": wh_id, "qty": {"$gt": 0}})
    if lvl:
        raise HTTPException(400, "Warehouse has stock — transfer or adjust to zero first")
    result = await db.warehouses.delete_one({"id": wh_id, **scope(user)})
    if result.deleted_count == 0:
        raise HTTPException(404, "Warehouse not found")
    await audit_log(user=user, action="delete", entity_type="warehouse", entity_id=wh_id)
    return {"deleted": True}


# =========================================================================
#                              STOCK LEVELS
# =========================================================================

@router.get("/stock")
async def stock_levels(
    warehouse_id: Optional[str] = None,
    product_id: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    q = scope(user)
    if warehouse_id:
        q["warehouse_id"] = warehouse_id
    if product_id:
        q["product_id"] = product_id
    items = await db.stock_levels.find(q, {"_id": 0}).to_list(10000)
    # Aggregate per product across warehouses
    per_product: dict = {}
    for row in items:
        pid = row["product_id"]
        per_product.setdefault(pid, {"product_id": pid, "total_qty": 0.0, "by_warehouse": []})
        per_product[pid]["total_qty"] += float(row.get("qty") or 0)
        per_product[pid]["by_warehouse"].append({
            "warehouse_id": row["warehouse_id"],
            "batch_id": row.get("batch_id"),
            "qty": row["qty"],
        })
    return {"levels": items, "summary": list(per_product.values())}


@router.post("/stock/adjust")
async def adjust_stock(body: StockAdjustIn, user: dict = Depends(get_current_user)):
    owner = user["current_ledger_id"]
    await _adjust_stock_level(owner, body.warehouse_id, body.product_id, body.batch_id, body.qty_delta)
    adj = {
        "id": new_id("adj_"),
        "owner_id": owner,
        **body.model_dump(),
        "at": now_iso(),
    }
    await db.stock_adjustments.insert_one(adj)
    await audit_log(user=user, action="stock-adjust", entity_type="stock", entity_id=body.product_id, after=adj)
    return sanitize(adj)


# =========================================================================
#                              BATCHES
# =========================================================================

@router.get("/batches")
async def list_batches(
    product_id: Optional[str] = None,
    expiring_within_days: Optional[int] = None,
    user: dict = Depends(get_current_user),
):
    q = scope(user)
    if product_id:
        q["product_id"] = product_id
    items = await db.batches.find(q, {"_id": 0}).sort("expiry_date", 1).to_list(5000)
    if expiring_within_days is not None:
        from datetime import date, timedelta
        cutoff = (date.today() + timedelta(days=expiring_within_days)).isoformat()
        items = [b for b in items if b.get("expiry_date") and b["expiry_date"] <= cutoff]
    return {"items": items, "total": len(items)}


@router.post("/batches")
async def create_batch(body: BatchIn, user: dict = Depends(get_current_user)):
    owner = user["current_ledger_id"]
    if not body.warehouse_id:
        body.warehouse_id = await _get_default_warehouse_id(owner)
    doc = {
        **body.model_dump(),
        "id": new_id("batch_"),
        "owner_id": owner,
        "created_at": now_iso(),
    }
    await db.batches.insert_one(doc)
    if body.initial_qty > 0 and body.warehouse_id:
        await _adjust_stock_level(owner, body.warehouse_id, body.product_id, doc["id"], body.initial_qty)
    await audit_log(user=user, action="create", entity_type="batch", entity_id=doc["id"], after=doc)
    return sanitize(doc)


@router.delete("/batches/{batch_id}")
async def delete_batch(batch_id: str, user: dict = Depends(get_current_user)):
    lvl = await db.stock_levels.find_one({"owner_id": user["current_ledger_id"], "batch_id": batch_id, "qty": {"$gt": 0}})
    if lvl:
        raise HTTPException(400, "Batch still has stock")
    result = await db.batches.delete_one({"id": batch_id, **scope(user)})
    if result.deleted_count == 0:
        raise HTTPException(404, "Batch not found")
    return {"deleted": True}


# =========================================================================
#                              SERIALS
# =========================================================================

@router.get("/serials")
async def list_serials(
    product_id: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = Query(100, ge=1, le=1000),
    user: dict = Depends(get_current_user),
):
    q = scope(user)
    if product_id:
        q["product_id"] = product_id
    if status:
        q["status"] = status
    if search:
        q["serial_no"] = {"$regex": search, "$options": "i"}
    total = await db.serials.count_documents(q)
    items = await db.serials.find(q, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.post("/serials")
async def create_serial(body: SerialIn, user: dict = Depends(get_current_user)):
    owner = user["current_ledger_id"]
    exists = await db.serials.find_one({"owner_id": owner, "serial_no": body.serial_no})
    if exists:
        raise HTTPException(400, "Serial number already exists")
    doc = {**body.model_dump(), "id": new_id("srl_"), "owner_id": owner, "created_at": now_iso()}
    await db.serials.insert_one(doc)
    return sanitize(doc)


@router.put("/serials/{srl_id}")
async def update_serial(srl_id: str, body: SerialIn, user: dict = Depends(get_current_user)):
    result = await db.serials.find_one_and_update(
        {"id": srl_id, **scope(user)},
        {"$set": {**body.model_dump(), "updated_at": now_iso()}},
        return_document=True,
    )
    if not result:
        raise HTTPException(404, "Serial not found")
    return sanitize(result)


@router.delete("/serials/{srl_id}")
async def delete_serial(srl_id: str, user: dict = Depends(get_current_user)):
    result = await db.serials.delete_one({"id": srl_id, **scope(user)})
    if result.deleted_count == 0:
        raise HTTPException(404, "Serial not found")
    return {"deleted": True}


# =========================================================================
#                              STOCK TRANSFERS
# =========================================================================

@router.get("/transfers")
async def list_transfers(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    user: dict = Depends(get_current_user),
):
    q = scope(user)
    if status:
        q["status"] = status
    total = await db.stock_transfers.count_documents(q)
    items = await db.stock_transfers.find(q, {"_id": 0}).sort("transfer_date", -1).skip(skip).limit(limit).to_list(limit)
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.post("/transfers")
async def create_transfer(body: TransferIn, user: dict = Depends(get_current_user)):
    owner = user["current_ledger_id"]
    if body.from_warehouse_id == body.to_warehouse_id:
        raise HTTPException(400, "Source and destination warehouses must differ")

    # Reduce stock immediately from source (in-transit)
    for line in body.lines:
        await _adjust_stock_level(owner, body.from_warehouse_id, line.product_id, line.batch_id, -line.qty)

    total_qty = sum(l.qty for l in body.lines)
    total_value = round(sum(l.qty * l.rate for l in body.lines), 2)

    doc = {
        **body.model_dump(),
        "id": new_id("xfer_"),
        "owner_id": owner,
        "transfer_no": f"ST-{int(datetime_now_epoch())}",
        "status": "in_transit",
        "total_qty": total_qty,
        "total_value": total_value,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.stock_transfers.insert_one(doc)
    await audit_log(user=user, action="create", entity_type="stock_transfer", entity_id=doc["id"], after=doc)
    return sanitize(doc)


@router.post("/transfers/{tid}/receive")
async def receive_transfer(tid: str, user: dict = Depends(get_current_user)):
    owner = user["current_ledger_id"]
    doc = await db.stock_transfers.find_one({"id": tid, "owner_id": owner}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Transfer not found")
    if doc.get("status") == "received":
        raise HTTPException(400, "Transfer already received")

    for line in doc.get("lines", []):
        await _adjust_stock_level(owner, doc["to_warehouse_id"], line["product_id"], line.get("batch_id"), line["qty"])

    updated = await db.stock_transfers.find_one_and_update(
        {"id": tid, "owner_id": owner},
        {"$set": {"status": "received", "received_at": now_iso(), "updated_at": now_iso()}},
        return_document=True,
    )
    await audit_log(user=user, action="receive", entity_type="stock_transfer", entity_id=tid, after=updated)
    return sanitize(updated)


@router.delete("/transfers/{tid}")
async def delete_transfer(tid: str, user: dict = Depends(get_current_user)):
    doc = await db.stock_transfers.find_one({"id": tid, **scope(user)}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Transfer not found")
    if doc.get("status") == "received":
        raise HTTPException(400, "Cannot delete a received transfer")
    # Reverse: put stock back into source
    owner = user["current_ledger_id"]
    for line in doc.get("lines", []):
        await _adjust_stock_level(owner, doc["from_warehouse_id"], line["product_id"], line.get("batch_id"), line["qty"])
    await db.stock_transfers.delete_one({"id": tid})
    await audit_log(user=user, action="delete", entity_type="stock_transfer", entity_id=tid)
    return {"deleted": True}


# helper — inline import to avoid another module dependency
def datetime_now_epoch():
    from datetime import datetime
    return datetime.utcnow().timestamp()
