"""
Manufacturing / Garment ERP router — Phase 8 (highest priority per user).

Adds a complete manufacturing workspace on top of the existing product/party
foundation. Every entity is owner-scoped (multi-ledger safe) and non-invasive:
uses its own MongoDB collections and never touches the existing invoices/products
schemas.

Domain model:
    Fabric           — raw-material master (name, GSM, color, unit, rate)
    BOM              — Bill of Materials for a finished product
    BOMLine          — one raw material entry inside a BOM
    ProductionOrder  — a manufacturing job (qty, size matrix, target date)
    ProductionStage  — one stage of an order: Cutting → Stitching → Embroidery
                       → Printing → Washing → Packing → QC (with completed_qty)
    JobWork          — outsourced stage assigned to a vendor party
    WastageEntry     — recorded wastage per production order / stage

Endpoints (all mounted under /api/manufacturing):
    /fabrics          GET, POST     PUT/DELETE /{id}
    /boms             GET, POST     PUT/DELETE /{id}
    /orders           GET, POST     GET/PUT/DELETE /{id}
                      POST /{id}/advance   — move to next stage
                      POST /{id}/stages/{stage_no}/update  — record completed_qty
    /job-work         GET, POST     PUT/DELETE /{id}
    /wastage          GET, POST     DELETE /{id}
    /dashboard        GET   — production KPIs (open orders, in-progress, delayed)

All list endpoints return `{items, total, skip, limit}` for pagination.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Optional, Literal
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

# Reuse the existing auth + db + scope helpers from server.py.
# This is a deliberate shortcut for Phase 2 — full split will move these
# into backend/deps.py later.
from server import db, get_current_user, scope  # noqa: E402


router = APIRouter(prefix="/api/manufacturing", tags=["manufacturing"])


# =========================================================================
#                              MODELS
# =========================================================================

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_id(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:12]}"


# ---------- Fabric ----------

class FabricIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    fabric_type: Optional[str] = Field(None, max_length=50)  # cotton / poly / mix
    gsm: Optional[int] = Field(None, ge=0, le=2000)
    color: Optional[str] = Field(None, max_length=50)
    unit: str = Field("meter", max_length=20)  # meter / kg / roll
    rate: float = Field(0.0, ge=0)
    stock_qty: float = Field(0.0, ge=0)
    min_stock: float = Field(0.0, ge=0)
    supplier_id: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=500)


class Fabric(FabricIn):
    id: str
    owner_id: str
    created_at: str
    updated_at: str


# ---------- BOM ----------

class BOMLine(BaseModel):
    material_id: str  # points to Fabric.id (or generic product.id)
    material_type: Literal["fabric", "product"] = "fabric"
    material_name: str  # snapshot for reporting
    qty: float = Field(..., ge=0)
    unit: str = "meter"
    wastage_pct: float = Field(0.0, ge=0, le=100)  # allowed wastage
    rate: float = Field(0.0, ge=0)  # per-unit cost (snapshot)


class BOMIn(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)
    product_id: Optional[str] = None  # link to existing products collection
    product_name: str = Field(..., min_length=1, max_length=100)
    size: Optional[str] = Field(None, max_length=20)
    color: Optional[str] = Field(None, max_length=50)
    lines: List[BOMLine] = Field(..., max_length=200)
    labour_cost: float = Field(0.0, ge=0)
    overhead_cost: float = Field(0.0, ge=0)
    notes: Optional[str] = Field(None, max_length=500)


class BOM(BOMIn):
    id: str
    owner_id: str
    material_cost: float
    total_cost: float
    created_at: str
    updated_at: str


def _compute_bom_costs(bom_in: BOMIn) -> tuple[float, float]:
    material_cost = 0.0
    for line in bom_in.lines:
        # base + wastage
        effective_qty = line.qty * (1.0 + line.wastage_pct / 100.0)
        material_cost += effective_qty * line.rate
    total = material_cost + bom_in.labour_cost + bom_in.overhead_cost
    return round(material_cost, 2), round(total, 2)


# ---------- Production Order + Stages ----------

DEFAULT_STAGES: List[str] = [
    "Cutting",
    "Stitching",
    "Embroidery",
    "Printing",
    "Washing",
    "Packing",
    "QC",
]


class SizeQty(BaseModel):
    size: str = Field(..., max_length=20)
    qty: int = Field(..., ge=0)


class ProductionOrderIn(BaseModel):
    order_no: Optional[str] = None
    bom_id: Optional[str] = None
    product_name: str = Field(..., min_length=1, max_length=100)
    party_id: Optional[str] = None  # buyer/customer party
    party_name: Optional[str] = Field(None, max_length=100)
    color: Optional[str] = Field(None, max_length=50)
    size_matrix: List[SizeQty] = Field(default_factory=list, max_length=30)
    total_qty: int = Field(..., ge=0)
    target_date: Optional[str] = None
    stages: List[str] = Field(default_factory=lambda: list(DEFAULT_STAGES), max_length=15)
    notes: Optional[str] = Field(None, max_length=500)


class ProductionStage(BaseModel):
    stage_no: int
    name: str
    assigned_to: Optional[str] = None  # vendor party id if outsourced
    assigned_name: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    completed_qty: int = 0
    wastage_qty: int = 0
    notes: Optional[str] = None


class ProductionOrder(BaseModel):
    id: str
    owner_id: str
    order_no: str
    bom_id: Optional[str]
    product_name: str
    party_id: Optional[str]
    party_name: Optional[str]
    color: Optional[str]
    size_matrix: List[SizeQty]
    total_qty: int
    target_date: Optional[str]
    current_stage_no: int  # 1-based
    status: Literal["pending", "in_progress", "completed", "cancelled"] = "pending"
    stages_detail: List[ProductionStage]
    notes: Optional[str]
    created_at: str
    updated_at: str


class StageUpdateIn(BaseModel):
    completed_qty: Optional[int] = Field(None, ge=0)
    wastage_qty: Optional[int] = Field(None, ge=0)
    assigned_to: Optional[str] = None
    assigned_name: Optional[str] = None
    started: Optional[bool] = None
    completed: Optional[bool] = None
    notes: Optional[str] = Field(None, max_length=500)


# ---------- Job Work ----------

class JobWorkIn(BaseModel):
    order_no: Optional[str] = None
    vendor_id: str = Field(..., min_length=1)
    vendor_name: str = Field(..., min_length=1, max_length=100)
    stage_name: str = Field(..., min_length=1, max_length=50)  # e.g. "Embroidery"
    production_order_id: Optional[str] = None
    qty_sent: int = Field(..., ge=0)
    qty_received: int = Field(0, ge=0)
    rate: float = Field(0.0, ge=0)
    sent_date: str
    expected_date: Optional[str] = None
    status: Literal["sent", "partial", "received", "cancelled"] = "sent"
    notes: Optional[str] = Field(None, max_length=500)


class JobWork(JobWorkIn):
    id: str
    owner_id: str
    total_amount: float
    created_at: str
    updated_at: str


# ---------- Wastage ----------

class WastageEntryIn(BaseModel):
    production_order_id: Optional[str] = None
    stage_name: Optional[str] = Field(None, max_length=50)
    material_id: Optional[str] = None
    material_name: Optional[str] = Field(None, max_length=100)
    qty: float = Field(..., ge=0)
    unit: str = Field("piece", max_length=20)
    reason: Optional[str] = Field(None, max_length=200)
    date: str
    value: float = Field(0.0, ge=0)


class WastageEntry(WastageEntryIn):
    id: str
    owner_id: str
    created_at: str


# =========================================================================
#                              HELPERS
# =========================================================================

async def _next_order_no(owner_id: str) -> str:
    """Simple monotonic order number PO-YYYY-####."""
    year = datetime.now(timezone.utc).year
    count = await db.production_orders.count_documents(
        {"owner_id": owner_id, "order_no": {"$regex": f"^PO-{year}-"}}
    )
    return f"PO-{year}-{count + 1:04d}"


def _sanitize(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


# =========================================================================
#                              FABRIC ROUTES
# =========================================================================

@router.get("/fabrics")
async def list_fabrics(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    search: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    q = scope(user)
    if search:
        q["name"] = {"$regex": search, "$options": "i"}
    total = await db.fabrics.count_documents(q)
    items = await db.fabrics.find(q, {"_id": 0}).sort("name", 1).skip(skip).limit(limit).to_list(limit)
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.post("/fabrics")
async def create_fabric(body: FabricIn, user: dict = Depends(get_current_user)):
    doc = {
        **body.model_dump(),
        "id": _new_id("fab_"),
        "owner_id": user["current_ledger_id"],
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    await db.fabrics.insert_one(doc)
    return _sanitize(doc)


@router.put("/fabrics/{fabric_id}")
async def update_fabric(fabric_id: str, body: FabricIn, user: dict = Depends(get_current_user)):
    result = await db.fabrics.find_one_and_update(
        {"id": fabric_id, **scope(user)},
        {"$set": {**body.model_dump(), "updated_at": _now_iso()}},
        return_document=True,
    )
    if not result:
        raise HTTPException(404, "Fabric not found")
    return _sanitize(result)


@router.delete("/fabrics/{fabric_id}")
async def delete_fabric(fabric_id: str, user: dict = Depends(get_current_user)):
    result = await db.fabrics.delete_one({"id": fabric_id, **scope(user)})
    if result.deleted_count == 0:
        raise HTTPException(404, "Fabric not found")
    return {"deleted": True}


# =========================================================================
#                              BOM ROUTES
# =========================================================================

@router.get("/boms")
async def list_boms(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    search: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    q = scope(user)
    if search:
        q["$or"] = [
            {"code": {"$regex": search, "$options": "i"}},
            {"product_name": {"$regex": search, "$options": "i"}},
        ]
    total = await db.boms.count_documents(q)
    items = await db.boms.find(q, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.get("/boms/{bom_id}")
async def get_bom(bom_id: str, user: dict = Depends(get_current_user)):
    doc = await db.boms.find_one({"id": bom_id, **scope(user)}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "BOM not found")
    return doc


@router.post("/boms")
async def create_bom(body: BOMIn, user: dict = Depends(get_current_user)):
    material_cost, total_cost = _compute_bom_costs(body)
    doc = {
        **body.model_dump(),
        "id": _new_id("bom_"),
        "owner_id": user["current_ledger_id"],
        "material_cost": material_cost,
        "total_cost": total_cost,
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    await db.boms.insert_one(doc)
    return _sanitize(doc)


@router.put("/boms/{bom_id}")
async def update_bom(bom_id: str, body: BOMIn, user: dict = Depends(get_current_user)):
    material_cost, total_cost = _compute_bom_costs(body)
    result = await db.boms.find_one_and_update(
        {"id": bom_id, **scope(user)},
        {"$set": {
            **body.model_dump(),
            "material_cost": material_cost,
            "total_cost": total_cost,
            "updated_at": _now_iso(),
        }},
        return_document=True,
    )
    if not result:
        raise HTTPException(404, "BOM not found")
    return _sanitize(result)


@router.delete("/boms/{bom_id}")
async def delete_bom(bom_id: str, user: dict = Depends(get_current_user)):
    result = await db.boms.delete_one({"id": bom_id, **scope(user)})
    if result.deleted_count == 0:
        raise HTTPException(404, "BOM not found")
    return {"deleted": True}


# =========================================================================
#                         PRODUCTION ORDER ROUTES
# =========================================================================

@router.get("/orders")
async def list_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    status: Optional[str] = None,
    search: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    q = scope(user)
    if status:
        q["status"] = status
    if search:
        q["$or"] = [
            {"order_no": {"$regex": search, "$options": "i"}},
            {"product_name": {"$regex": search, "$options": "i"}},
            {"party_name": {"$regex": search, "$options": "i"}},
        ]
    total = await db.production_orders.count_documents(q)
    items = await db.production_orders.find(q, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.get("/orders/{order_id}")
async def get_order(order_id: str, user: dict = Depends(get_current_user)):
    doc = await db.production_orders.find_one({"id": order_id, **scope(user)}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Production order not found")
    return doc


@router.post("/orders")
async def create_order(body: ProductionOrderIn, user: dict = Depends(get_current_user)):
    order_no = body.order_no or await _next_order_no(user["current_ledger_id"])
    stages_detail = [
        {
            "stage_no": i + 1,
            "name": name,
            "assigned_to": None,
            "assigned_name": None,
            "started_at": None,
            "completed_at": None,
            "completed_qty": 0,
            "wastage_qty": 0,
            "notes": None,
        }
        for i, name in enumerate(body.stages)
    ]
    doc = {
        **body.model_dump(),
        "id": _new_id("po_"),
        "owner_id": user["current_ledger_id"],
        "order_no": order_no,
        "current_stage_no": 1,
        "status": "pending",
        "stages_detail": stages_detail,
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    await db.production_orders.insert_one(doc)
    return _sanitize(doc)


@router.put("/orders/{order_id}")
async def update_order(order_id: str, body: ProductionOrderIn, user: dict = Depends(get_current_user)):
    existing = await db.production_orders.find_one({"id": order_id, **scope(user)}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Production order not found")
    # keep existing stages_detail progress; only update meta fields
    payload = body.model_dump()
    payload["stages_detail"] = existing["stages_detail"]
    payload["updated_at"] = _now_iso()
    result = await db.production_orders.find_one_and_update(
        {"id": order_id, **scope(user)},
        {"$set": payload},
        return_document=True,
    )
    return _sanitize(result)


@router.delete("/orders/{order_id}")
async def delete_order(order_id: str, user: dict = Depends(get_current_user)):
    result = await db.production_orders.delete_one({"id": order_id, **scope(user)})
    if result.deleted_count == 0:
        raise HTTPException(404, "Production order not found")
    return {"deleted": True}


@router.post("/orders/{order_id}/stages/{stage_no}/update")
async def update_stage(
    order_id: str,
    stage_no: int,
    body: StageUpdateIn,
    user: dict = Depends(get_current_user),
):
    doc = await db.production_orders.find_one({"id": order_id, **scope(user)}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Production order not found")
    stages = doc["stages_detail"]
    idx = next((i for i, s in enumerate(stages) if s["stage_no"] == stage_no), -1)
    if idx == -1:
        raise HTTPException(404, f"Stage {stage_no} not found on this order")

    stage = stages[idx]
    if body.completed_qty is not None:
        stage["completed_qty"] = body.completed_qty
    if body.wastage_qty is not None:
        stage["wastage_qty"] = body.wastage_qty
    if body.assigned_to is not None:
        stage["assigned_to"] = body.assigned_to
    if body.assigned_name is not None:
        stage["assigned_name"] = body.assigned_name
    if body.notes is not None:
        stage["notes"] = body.notes
    if body.started and not stage["started_at"]:
        stage["started_at"] = _now_iso()
    if body.completed:
        stage["completed_at"] = _now_iso()

    # recompute order status and current_stage_no
    completed_stages = [s for s in stages if s["completed_at"]]
    status: str = "pending"
    if len(completed_stages) == len(stages):
        status = "completed"
        current_stage_no = len(stages)
    elif any(s["started_at"] for s in stages):
        status = "in_progress"
        # first uncompleted stage
        current_stage_no = next(
            (s["stage_no"] for s in stages if not s["completed_at"]),
            stages[-1]["stage_no"],
        )
    else:
        current_stage_no = 1

    await db.production_orders.update_one(
        {"id": order_id, **scope(user)},
        {"$set": {
            "stages_detail": stages,
            "status": status,
            "current_stage_no": current_stage_no,
            "updated_at": _now_iso(),
        }},
    )
    updated = await db.production_orders.find_one({"id": order_id}, {"_id": 0})
    return updated


@router.post("/orders/{order_id}/advance")
async def advance_order(order_id: str, user: dict = Depends(get_current_user)):
    """Mark current stage completed and move to the next stage."""
    doc = await db.production_orders.find_one({"id": order_id, **scope(user)}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Production order not found")
    stages = doc["stages_detail"]
    cur = doc.get("current_stage_no", 1)
    idx = next((i for i, s in enumerate(stages) if s["stage_no"] == cur), -1)
    if idx == -1:
        raise HTTPException(400, "Invalid current stage")

    stages[idx]["completed_at"] = _now_iso()
    if not stages[idx].get("started_at"):
        stages[idx]["started_at"] = _now_iso()
    # ensure completed_qty defaults to total_qty if not set
    if not stages[idx].get("completed_qty"):
        stages[idx]["completed_qty"] = doc.get("total_qty", 0)

    if idx + 1 < len(stages):
        new_stage = stages[idx + 1]["stage_no"]
        new_status = "in_progress"
        if not stages[idx + 1].get("started_at"):
            stages[idx + 1]["started_at"] = _now_iso()
    else:
        new_stage = cur
        new_status = "completed"

    await db.production_orders.update_one(
        {"id": order_id, **scope(user)},
        {"$set": {
            "stages_detail": stages,
            "current_stage_no": new_stage,
            "status": new_status,
            "updated_at": _now_iso(),
        }},
    )
    return await db.production_orders.find_one({"id": order_id}, {"_id": 0})


# =========================================================================
#                              JOB WORK ROUTES
# =========================================================================

@router.get("/job-work")
async def list_job_work(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    status: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    q = scope(user)
    if status:
        q["status"] = status
    total = await db.job_work.count_documents(q)
    items = await db.job_work.find(q, {"_id": 0}).sort("sent_date", -1).skip(skip).limit(limit).to_list(limit)
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.post("/job-work")
async def create_job_work(body: JobWorkIn, user: dict = Depends(get_current_user)):
    total = round(body.qty_sent * body.rate, 2)
    doc = {
        **body.model_dump(),
        "id": _new_id("jw_"),
        "owner_id": user["current_ledger_id"],
        "total_amount": total,
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    await db.job_work.insert_one(doc)
    return _sanitize(doc)


@router.put("/job-work/{jw_id}")
async def update_job_work(jw_id: str, body: JobWorkIn, user: dict = Depends(get_current_user)):
    total = round(body.qty_sent * body.rate, 2)
    result = await db.job_work.find_one_and_update(
        {"id": jw_id, **scope(user)},
        {"$set": {**body.model_dump(), "total_amount": total, "updated_at": _now_iso()}},
        return_document=True,
    )
    if not result:
        raise HTTPException(404, "Job-work entry not found")
    return _sanitize(result)


@router.delete("/job-work/{jw_id}")
async def delete_job_work(jw_id: str, user: dict = Depends(get_current_user)):
    result = await db.job_work.delete_one({"id": jw_id, **scope(user)})
    if result.deleted_count == 0:
        raise HTTPException(404, "Job-work entry not found")
    return {"deleted": True}


# =========================================================================
#                              WASTAGE ROUTES
# =========================================================================

@router.get("/wastage")
async def list_wastage(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    user: dict = Depends(get_current_user),
):
    q = scope(user)
    total = await db.wastage_entries.count_documents(q)
    items = await db.wastage_entries.find(q, {"_id": 0}).sort("date", -1).skip(skip).limit(limit).to_list(limit)
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.post("/wastage")
async def create_wastage(body: WastageEntryIn, user: dict = Depends(get_current_user)):
    doc = {
        **body.model_dump(),
        "id": _new_id("wst_"),
        "owner_id": user["current_ledger_id"],
        "created_at": _now_iso(),
    }
    await db.wastage_entries.insert_one(doc)
    return _sanitize(doc)


@router.delete("/wastage/{wst_id}")
async def delete_wastage(wst_id: str, user: dict = Depends(get_current_user)):
    result = await db.wastage_entries.delete_one({"id": wst_id, **scope(user)})
    if result.deleted_count == 0:
        raise HTTPException(404, "Wastage entry not found")
    return {"deleted": True}


# =========================================================================
#                              DASHBOARD
# =========================================================================

@router.get("/dashboard")
async def manufacturing_dashboard(user: dict = Depends(get_current_user)):
    """Manufacturing KPIs — for the ERP dashboard tile."""
    q = scope(user)
    today = datetime.now(timezone.utc).date().isoformat()

    open_orders = await db.production_orders.count_documents({**q, "status": {"$in": ["pending", "in_progress"]}})
    completed = await db.production_orders.count_documents({**q, "status": "completed"})
    delayed = await db.production_orders.count_documents({
        **q,
        "status": {"$in": ["pending", "in_progress"]},
        "target_date": {"$lt": today, "$ne": None},
    })
    total_boms = await db.boms.count_documents(q)
    total_fabrics = await db.fabrics.count_documents(q)
    total_wastage_docs = await db.wastage_entries.find(q, {"_id": 0, "value": 1}).to_list(10000)
    wastage_value = round(sum((d.get("value") or 0.0) for d in total_wastage_docs), 2)

    # per-stage current-load count (how many orders are currently on each stage)
    orders_active = await db.production_orders.find(
        {**q, "status": "in_progress"},
        {"_id": 0, "current_stage_no": 1, "stages_detail": 1},
    ).to_list(1000)
    stage_load: dict = {}
    for o in orders_active:
        cur = o.get("current_stage_no", 1)
        stages = o.get("stages_detail", [])
        stage = next((s for s in stages if s.get("stage_no") == cur), None)
        if stage:
            name = stage.get("name", f"Stage {cur}")
            stage_load[name] = stage_load.get(name, 0) + 1

    return {
        "open_orders": open_orders,
        "completed_orders": completed,
        "delayed_orders": delayed,
        "total_boms": total_boms,
        "total_fabrics": total_fabrics,
        "wastage_value": wastage_value,
        "stage_load": stage_load,
    }
