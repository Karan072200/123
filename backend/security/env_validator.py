"""
Environment variable validation.

Called during FastAPI startup — refuses to boot the app in production mode
if a required secret is missing or set to an obviously insecure placeholder.

We deliberately let dev sandboxes (localhost / preview URLs) pass with softer
rules so contributors can `docker compose up` without a full .env dance.
"""
from __future__ import annotations

import logging
import os

log = logging.getLogger("apka.env")


REQUIRED_ALWAYS = [
    "MONGO_URL",
    "DB_NAME",
    "JWT_SECRET",
]

# In production these MUST be set; in dev they're warned about.
REQUIRED_IN_PROD = [
    "GOOGLE_CLIENT_ID",
    "CORS_ORIGINS",
    "FRONTEND_URL",
]

# Values that are known-weak placeholders (from .env.example etc.).
INSECURE_PLACEHOLDERS = {
    "CHANGE_ME_TO_A_LONG_RANDOM_STRING",
    "change-me",
    "changeme",
    "your-jwt-secret",
    "secret",
    "password",
    "1234",
    "dev-placeholder.apps.googleusercontent.com",
}


class EnvValidationError(RuntimeError):
    """Raised when the environment is invalid and we refuse to start."""


def _is_prod() -> bool:
    env = (os.environ.get("APP_ENV") or os.environ.get("ENV") or os.environ.get("ENVIRONMENT") or "").lower()
    if env in {"prod", "production", "live"}:
        return True
    # Heuristic: the FRONTEND_URL points to a real domain (not localhost/preview)
    fu = (os.environ.get("FRONTEND_URL") or "").lower()
    if fu and not any(k in fu for k in ("localhost", "127.0.0.1", "preview.emergentagent")):
        return True
    return False


def validate_env(strict: bool | None = None) -> list[str]:
    """Return a list of validation errors. Empty list = OK.

    If *strict* is True, raise EnvValidationError on any error.
    If *strict* is None (default), auto-detect prod and enforce there only.
    """
    errors: list[str] = []
    warnings: list[str] = []
    prod = _is_prod()

    # Always required
    for key in REQUIRED_ALWAYS:
        val = (os.environ.get(key) or "").strip()
        if not val:
            errors.append(f"Missing required env var: {key}")

    # Weak JWT secret
    jwt_secret = (os.environ.get("JWT_SECRET") or "").strip()
    if jwt_secret:
        if jwt_secret in INSECURE_PLACEHOLDERS:
            errors.append("JWT_SECRET is set to a known insecure placeholder — rotate it")
        elif len(jwt_secret) < 32:
            (errors if prod else warnings).append(
                f"JWT_SECRET is only {len(jwt_secret)} chars — recommended minimum 32"
            )

    # Google client id placeholder
    gid = (os.environ.get("GOOGLE_CLIENT_ID") or "").strip()
    if gid in INSECURE_PLACEHOLDERS:
        (errors if prod else warnings).append("GOOGLE_CLIENT_ID is a placeholder")

    # Required-in-prod
    for key in REQUIRED_IN_PROD:
        val = (os.environ.get(key) or "").strip()
        if not val:
            (errors if prod else warnings).append(f"Missing prod env var: {key}")

    # CORS should never be "*" or blank in prod
    cors = (os.environ.get("CORS_ORIGINS") or "").strip()
    if prod and (cors == "*" or "," not in cors and not cors):
        errors.append("CORS_ORIGINS must be an explicit comma-separated allowlist in prod")

    for w in warnings:
        log.warning("[env] %s", w)
    for e in errors:
        log.error("[env] %s", e)

    should_raise = strict if strict is not None else prod
    if should_raise and errors:
        raise EnvValidationError(
            "Environment validation failed:\n  - " + "\n  - ".join(errors)
        )
    return errors
