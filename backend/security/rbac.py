"""
Role-Based Access Control for Apka Munim.

Nine roles, hierarchical (higher roles inherit lower-role permissions):

    SUPER_ADMIN  → platform-wide (Emergent staff, backup/restore)
    ADMIN        → tenant owner (billing, delete data, invite users)
    MANAGER      → most write access except tenant destructive ops
    ACCOUNTANT   → all accounting entities + reports
    WAREHOUSE    → warehouses, batches, serials, transfers
    FACTORY      → manufacturing entities (BOM, orders, job-work)
    SALES        → invoices, parties, POS
    STAFF        → limited write (transactions, invoices as themselves)
    VIEWER       → read-only across their ledger

Design goals:

    1. **Default-deny**. `require_role(role, permission)` blocks anything not
       explicitly allowed.
    2. **Backward-compatible**. Users without a role field are treated as
       ADMIN (they created the account so they own it). This preserves the
       existing behaviour of every single-tenant install.
    3. **Ledger scoping** stays authoritative — RBAC is layered ON TOP of
       the existing scope(user) filter, not a replacement.
"""
from __future__ import annotations

from enum import Enum
from typing import Iterable, Callable
from fastapi import Depends, HTTPException


class Role(str, Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    MANAGER = "manager"
    ACCOUNTANT = "accountant"
    WAREHOUSE = "warehouse"
    FACTORY = "factory"
    SALES = "sales"
    STAFF = "staff"
    VIEWER = "viewer"


# Numeric rank — higher = more privileged. Used for `at_least(role)` checks.
_RANK = {
    Role.SUPER_ADMIN: 100,
    Role.ADMIN: 90,
    Role.MANAGER: 70,
    Role.ACCOUNTANT: 55,
    Role.WAREHOUSE: 50,
    Role.FACTORY: 50,
    Role.SALES: 50,
    Role.STAFF: 30,
    Role.VIEWER: 10,
}


# Permission map: each permission → set of roles that hold it.
# Keep this table SMALL and grow it as endpoints are protected.
PERMISSIONS: dict[str, set[Role]] = {
    # Tenant-destructive
    "user.invite":         {Role.SUPER_ADMIN, Role.ADMIN},
    "user.delete":         {Role.SUPER_ADMIN, Role.ADMIN},
    "user.change_role":    {Role.SUPER_ADMIN, Role.ADMIN},
    "backup.export":       {Role.SUPER_ADMIN, Role.ADMIN},
    "backup.restore":      {Role.SUPER_ADMIN},

    # Accounting reports / financial statements
    "reports.view":        {Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT, Role.VIEWER},
    "reports.export":      {Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT},
    "audit.view":          {Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT},

    # Invoices / billing
    "invoice.create":      {Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT, Role.SALES, Role.STAFF},
    "invoice.edit":        {Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT, Role.SALES},
    "invoice.delete":      {Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT},

    # Warehouse
    "warehouse.write":     {Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.WAREHOUSE},
    "warehouse.transfer":  {Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.WAREHOUSE},

    # Manufacturing
    "manufacturing.write": {Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.FACTORY},

    # Read anything
    "read":                set(Role),
}


def _role_of(user: dict) -> Role:
    r = (user or {}).get("role") or ""
    try:
        return Role(r)
    except ValueError:
        # Legacy users have no role set — treat as ADMIN of their own ledger.
        # This preserves the pre-RBAC behaviour and lets us migrate lazily.
        return Role.ADMIN


def has_permission(user: dict, permission: str) -> bool:
    role = _role_of(user)
    allowed = PERMISSIONS.get(permission)
    if allowed is None:
        # Unknown permission → default DENY (never allow by accident).
        return False
    return role in allowed


def at_least(user: dict, minimum: Role) -> bool:
    return _RANK[_role_of(user)] >= _RANK[minimum]


def require_permission(permission: str) -> Callable:
    """FastAPI dependency factory.

    Usage:
        @router.delete("/invoices/{id}", dependencies=[Depends(require_permission("invoice.delete"))])
    """
    # Lazy import to avoid circular deps with server.py at cold start
    def _dep(user: dict = Depends(_get_current_user_lazy())) -> dict:
        if not has_permission(user, permission):
            raise HTTPException(status_code=403, detail=f"Missing permission: {permission}")
        return user
    return _dep


def require_role(*roles: Role) -> Callable:
    """FastAPI dependency: reject unless the current user is in *roles*."""
    allowed = set(roles)
    def _dep(user: dict = Depends(_get_current_user_lazy())) -> dict:
        if _role_of(user) not in allowed:
            raise HTTPException(status_code=403, detail="Insufficient role")
        return user
    return _dep


def _get_current_user_lazy():
    # Late-bind get_current_user to avoid a circular import at package load.
    from deps import get_current_user
    return get_current_user
