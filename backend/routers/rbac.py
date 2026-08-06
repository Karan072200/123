"""
RBAC admin router.

Endpoints:
    GET  /api/rbac/me             — current user's role + effective permissions
    GET  /api/rbac/roles          — list all roles + their permission matrix
    POST /api/rbac/change-role    — admin-only: set a user's role
    POST /api/rbac/check-permission — helper for FE to gate UI
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field

from deps import db, get_current_user, audit_log
from security.rbac import (
    Role, PERMISSIONS, _role_of, has_permission, require_permission,
)


router = APIRouter(prefix="/api/rbac", tags=["rbac"])


class ChangeRoleIn(BaseModel):
    user_email: EmailStr
    role: Role


class CheckPermissionIn(BaseModel):
    permission: str = Field(..., min_length=1, max_length=64)


@router.get("/me")
async def rbac_me(user: dict = Depends(get_current_user)):
    role = _role_of(user)
    perms = [p for p, allowed in PERMISSIONS.items() if role in allowed]
    return {
        "role": role.value,
        "permissions": sorted(perms),
        "email": user.get("email"),
        "is_admin_or_above": role in (Role.SUPER_ADMIN, Role.ADMIN),
    }


@router.get("/roles")
async def list_roles(user: dict = Depends(get_current_user)):
    return {
        "roles": [
            {
                "role": r.value,
                "permissions": sorted(p for p, allowed in PERMISSIONS.items() if r in allowed),
            }
            for r in Role
        ]
    }


@router.post(
    "/change-role",
    dependencies=[Depends(require_permission("user.change_role"))],
)
async def change_role(body: ChangeRoleIn, user: dict = Depends(get_current_user)):
    # Emails are always stored lower-case (see server.py register/login) —
    # match that when looking up.
    target_email = str(body.user_email).lower()
    target = await db.users.find_one({"email": target_email})
    if not target:
        # Fall back to case-insensitive regex once, in case of legacy uppercase writes.
        import re as _re
        target = await db.users.find_one({"email": {"$regex": f"^{_re.escape(target_email)}$", "$options": "i"}})
    if not target:
        raise HTTPException(404, "User not found")
    # Only same-ledger users can be edited (unless super_admin)
    role = _role_of(user)
    if role != Role.SUPER_ADMIN:
        if target.get("current_ledger_id") != user.get("current_ledger_id"):
            raise HTTPException(403, "Cannot change role of a user outside your ledger")
    before = target.get("role")
    await db.users.update_one({"id": target["id"]}, {"$set": {"role": body.role.value}})
    await audit_log(
        user=user,
        action="user.change_role",
        entity_type="user",
        entity_id=target["id"],
        before={"role": before},
        after={"role": body.role.value},
    )
    return {"email": target_email, "role": body.role.value}


@router.post("/check-permission")
async def check_permission(body: CheckPermissionIn, user: dict = Depends(get_current_user)):
    return {"permission": body.permission, "allowed": has_permission(user, body.permission)}
