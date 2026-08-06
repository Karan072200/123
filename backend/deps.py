"""
Shared dependencies for modular routers.

Phase 2 (Foundation Fix, part 2): New feature routers should import
from here instead of directly from server.py so that a future full
split of server.py becomes a mechanical move rather than a rewrite.

For now this module re-exports the existing helpers already defined
in server.py — so we can incrementally migrate call sites without any
behaviour change.

USAGE (in new router modules):

    from deps import db, get_current_user, scope, audit_log

instead of:

    from server import db, get_current_user, scope
"""
from __future__ import annotations

# Re-export the app-wide singletons so new modules don't touch server.py
from server import db, client, get_current_user, scope, JWT_SECRET  # noqa: F401
from server import JWT_ALGORITHM as ALGORITHM  # noqa: F401

from datetime import datetime, timezone
import uuid


def now_iso() -> str:
    """Standard timestamp helper used across new modules."""
    return datetime.now(timezone.utc).isoformat()


def new_id(prefix: str = "") -> str:
    """UUID4 (12-char) with optional prefix. Never use Mongo ObjectId."""
    return f"{prefix}{uuid.uuid4().hex[:12]}"


async def audit_log(
    *,
    user: dict,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    before: dict | None = None,
    after: dict | None = None,
    meta: dict | None = None,
) -> None:
    """Immutable append-only trail for every state-mutating action.

    Called from routers whenever an entity is created/updated/deleted so
    finance history can be reconstructed and compliance queries answered.
    """
    try:
        await db.audit_logs.insert_one({
            "id": new_id("aud_"),
            "owner_id": user.get("current_ledger_id"),
            "user_id": user.get("id"),
            "user_email": user.get("email"),
            "at": now_iso(),
            "action": action,             # 'create' | 'update' | 'delete' | 'login' | ...
            "entity_type": entity_type,   # 'invoice' | 'party' | 'product' | ...
            "entity_id": entity_id,
            "before": _strip_ids(before),
            "after": _strip_ids(after),
            "meta": meta or {},
        })
    except Exception:
        # Never let audit-log failures break the actual operation.
        pass


def _strip_ids(obj):
    """Recursively drop Mongo ObjectId + `_id` keys so audit_logs stays JSON-serialisable."""
    if obj is None:
        return None
    if isinstance(obj, dict):
        return {k: _strip_ids(v) for k, v in obj.items() if k != "_id"}
    if isinstance(obj, list):
        return [_strip_ids(x) for x in obj]
    # bson.ObjectId is not iterable and not JSON serialisable — coerce to str
    try:
        from bson import ObjectId
        if isinstance(obj, ObjectId):
            return str(obj)
    except Exception:
        pass
    return obj


def sanitize(doc: dict | None) -> dict | None:
    """Strip Mongo _id from a returned doc (we always use our own `id`)."""
    if not doc:
        return doc
    doc.pop("_id", None)
    return doc
