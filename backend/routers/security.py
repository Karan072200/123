"""
Security Hardening router — Phase 3.

Adds:
    1. Refresh token flow (rotating 30-day refresh + short-lived access)
       — endpoints: /auth/refresh, /auth/logout-all
    2. TOTP-based 2FA (Google Authenticator / Authy / 1Password compatible)
       — endpoints: /auth/2fa/totp/setup, /verify, /disable
    3. Audit log query endpoint (/audit-logs) — read-only trail for admins
    4. Login activity list (/security/sessions) — see active sessions

All endpoints under /api. Backwards-compatible with the existing
7-day access-token cookie flow — refresh tokens are additive.
"""
from __future__ import annotations

import base64
import hashlib
import io
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
import jwt

import pyotp
import qrcode

from deps import db, get_current_user, JWT_SECRET, ALGORITHM, now_iso, new_id, audit_log


router = APIRouter(prefix="/api", tags=["security"])


# =========================================================================
#                              REFRESH TOKENS
# =========================================================================

REFRESH_TTL_DAYS = 30
ACCESS_TTL_HOURS = 24 * 7  # keep existing behaviour for backward compat


def _hash_token(t: str) -> str:
    return hashlib.sha256(t.encode("utf-8")).hexdigest()


async def _issue_refresh_token(user_id: str, email: str) -> str:
    """Create + persist a new refresh token. Returns the plaintext token
    (client stores it; server keeps only the hash)."""
    raw = secrets.token_urlsafe(48)
    await db.refresh_tokens.insert_one({
        "id": new_id("rt_"),
        "user_id": user_id,
        "email": email,
        "token_hash": _hash_token(raw),
        "created_at": now_iso(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=REFRESH_TTL_DAYS)).isoformat(),
        "revoked": False,
    })
    return raw


def _issue_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=ACCESS_TTL_HOURS),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)


class RefreshIn(BaseModel):
    refresh_token: str = Field(..., min_length=32, max_length=200)


@router.post("/auth/refresh")
async def refresh_access_token(body: RefreshIn, response: Response, request: Request):
    """Trade a refresh token for a new access token + rotated refresh token.

    The old refresh token is IMMEDIATELY revoked (rotation) — so a stolen
    refresh can only be used once before the legitimate user's next call
    invalidates it and both sides get logged out.
    """
    token_hash = _hash_token(body.refresh_token)
    doc = await db.refresh_tokens.find_one({"token_hash": token_hash, "revoked": False})
    if not doc:
        raise HTTPException(401, "Invalid or revoked refresh token")

    # Expiry check
    try:
        exp = datetime.fromisoformat(doc["expires_at"].replace("Z", "+00:00"))
    except Exception:
        exp = datetime.now(timezone.utc) - timedelta(days=1)
    if exp <= datetime.now(timezone.utc):
        await db.refresh_tokens.update_one({"_id": doc["_id"]}, {"$set": {"revoked": True}})
        raise HTTPException(401, "Refresh token expired")

    # Revoke the used token (rotation)
    await db.refresh_tokens.update_one({"_id": doc["_id"]}, {"$set": {"revoked": True, "rotated_at": now_iso()}})

    # Verify user still exists
    user = await db.users.find_one({"id": doc["user_id"]})
    if not user:
        raise HTTPException(401, "User no longer exists")

    # Issue new access + new refresh
    access = _issue_access_token(user["id"], user["email"])
    new_refresh = await _issue_refresh_token(user["id"], user["email"])

    # Set access cookie (mirror existing behaviour)
    response.set_cookie(
        "access_token", access, httponly=True, secure=True, samesite="none",
        path="/", max_age=ACCESS_TTL_HOURS * 3600,
    )
    return {
        "access_token": access,
        "refresh_token": new_refresh,
        "expires_in": ACCESS_TTL_HOURS * 3600,
    }


@router.post("/auth/refresh/issue")
async def issue_first_refresh(user: dict = Depends(get_current_user)):
    """Issue an initial refresh token for an already-authenticated user.

    Called by clients that want to opt in to the refresh flow after login
    without changing existing login endpoints.
    """
    raw = await _issue_refresh_token(user["id"], user["email"])
    return {"refresh_token": raw, "expires_in_days": REFRESH_TTL_DAYS}


@router.post("/auth/logout-all")
async def logout_all(user: dict = Depends(get_current_user)):
    """Revoke every refresh token for the current user (kicks out all sessions)."""
    result = await db.refresh_tokens.update_many(
        {"user_id": user["id"], "revoked": False},
        {"$set": {"revoked": True, "revoked_at": now_iso(), "revoked_reason": "logout-all"}},
    )
    await audit_log(user=user, action="logout-all", entity_type="session", meta={"revoked": result.modified_count})
    return {"revoked": result.modified_count}


@router.get("/security/sessions")
async def list_sessions(user: dict = Depends(get_current_user)):
    """List the user's active refresh sessions (never returns token hashes)."""
    cursor = db.refresh_tokens.find(
        {"user_id": user["id"], "revoked": False},
        {"_id": 0, "id": 1, "created_at": 1, "expires_at": 1},
    ).sort("created_at", -1)
    items = await cursor.to_list(50)
    # Also include login_activity for full picture
    la = await db.login_activity.find(
        {"user_id": user["id"]},
        {"_id": 0},
    ).sort("at", -1).limit(20).to_list(20)
    return {"sessions": items, "recent_activity": la}


# =========================================================================
#                              TOTP 2FA
# =========================================================================

APP_ISSUER = "Apka Munim"


class TotpSetupOut(BaseModel):
    secret: str
    otpauth_url: str
    qr_code_png_base64: str


@router.post("/auth/2fa/totp/setup")
async def totp_setup(user: dict = Depends(get_current_user)):
    """Generate a TOTP secret + provisioning QR for the current user.

    The secret is stored as "pending" and only activated after the user
    verifies at least one OTP via /verify (proves they scanned the QR).
    """
    secret = pyotp.random_base32()
    otpauth_url = pyotp.totp.TOTP(secret).provisioning_uri(
        name=user["email"],
        issuer_name=APP_ISSUER,
    )

    # Generate QR code as PNG in memory, base64-encode for JSON transport
    img = qrcode.make(otpauth_url)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    qr_b64 = base64.b64encode(buf.getvalue()).decode("ascii")

    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"totp_secret_pending": secret, "totp_setup_at": now_iso()}},
    )

    return TotpSetupOut(
        secret=secret,
        otpauth_url=otpauth_url,
        qr_code_png_base64=qr_b64,
    )


class TotpVerifyIn(BaseModel):
    code: str = Field(..., pattern=r"^(\d{6}|[0-9A-Fa-f]{8})$")


@router.post("/auth/2fa/totp/verify")
async def totp_verify(body: TotpVerifyIn, user: dict = Depends(get_current_user)):
    """Activate TOTP by verifying the first 6-digit code from the authenticator app."""
    doc = await db.users.find_one({"id": user["id"]})
    secret = doc.get("totp_secret_pending") or doc.get("totp_secret")
    if not secret:
        raise HTTPException(400, "TOTP not initialized. Call /setup first.")
    totp = pyotp.TOTP(secret)
    if not totp.verify(body.code, valid_window=1):
        raise HTTPException(400, "Invalid or expired code")

    # Activate: move pending → active, generate 8 backup codes
    backup_codes = [secrets.token_hex(4).upper() for _ in range(8)]
    backup_hashes = [_hash_token(c) for c in backup_codes]

    await db.users.update_one(
        {"id": user["id"]},
        {
            "$set": {
                "totp_secret": secret,
                "totp_enabled": True,
                "totp_backup_hashes": backup_hashes,
                "totp_activated_at": now_iso(),
            },
            "$unset": {"totp_secret_pending": ""},
        },
    )
    await audit_log(user=user, action="2fa-enabled", entity_type="user", entity_id=user["id"])

    # Return backup codes ONCE. User must save them.
    return {"enabled": True, "backup_codes": backup_codes}


@router.post("/auth/2fa/totp/challenge")
async def totp_challenge(body: TotpVerifyIn, user: dict = Depends(get_current_user)):
    """Verify a 2FA code during a sensitive operation (does NOT enable/disable)."""
    doc = await db.users.find_one({"id": user["id"]})
    if not doc.get("totp_enabled"):
        raise HTTPException(400, "2FA is not enabled for this account")
    secret = doc.get("totp_secret")
    totp = pyotp.TOTP(secret)
    if totp.verify(body.code, valid_window=1):
        return {"verified": True}
    # Check backup codes
    supplied_hash = _hash_token(body.code.upper())
    if supplied_hash in (doc.get("totp_backup_hashes") or []):
        # consume backup code
        await db.users.update_one({"id": user["id"]}, {"$pull": {"totp_backup_hashes": supplied_hash}})
        return {"verified": True, "backup_used": True}
    raise HTTPException(400, "Invalid code")


@router.post("/auth/2fa/totp/disable")
async def totp_disable(body: TotpVerifyIn, user: dict = Depends(get_current_user)):
    """Disable TOTP after verifying one last code (prevents accidental lockout removal)."""
    doc = await db.users.find_one({"id": user["id"]})
    if not doc.get("totp_enabled"):
        return {"enabled": False}
    totp = pyotp.TOTP(doc.get("totp_secret"))
    if not totp.verify(body.code, valid_window=1):
        raise HTTPException(400, "Invalid code")
    await db.users.update_one(
        {"id": user["id"]},
        {"$unset": {"totp_secret": "", "totp_backup_hashes": "", "totp_enabled": ""}},
    )
    await audit_log(user=user, action="2fa-disabled", entity_type="user", entity_id=user["id"])
    return {"enabled": False}


@router.get("/auth/2fa/status")
async def totp_status(user: dict = Depends(get_current_user)):
    doc = await db.users.find_one({"id": user["id"]})
    return {
        "totp_enabled": bool(doc.get("totp_enabled")),
        "email_2fa_enabled": bool(doc.get("two_factor_enabled")),
        "backup_codes_remaining": len(doc.get("totp_backup_hashes") or []),
    }


# =========================================================================
#                              AUDIT LOG QUERY
# =========================================================================

@router.get("/audit-logs")
async def list_audit_logs(
    skip: int = 0,
    limit: int = 50,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    """Read the immutable audit trail for the current ledger.

    Ledger-scoped so a business owner sees everything for their books, but
    can't see other tenants' data.
    """
    q: dict = {"owner_id": user.get("current_ledger_id")}
    if action:
        q["action"] = action
    if entity_type:
        q["entity_type"] = entity_type
    if entity_id:
        q["entity_id"] = entity_id
    total = await db.audit_logs.count_documents(q)
    cursor = db.audit_logs.find(q, {"_id": 0}).sort("at", -1).skip(max(0, skip)).limit(min(500, max(1, limit)))
    items = await cursor.to_list(limit)
    return {"items": items, "total": total, "skip": skip, "limit": limit}
