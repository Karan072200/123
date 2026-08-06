"""
Log sanitization.

Financial ERPs must never log secrets. This module provides a `SanitizingFilter`
that scrubs common secret patterns from every log record before it is emitted.
"""
from __future__ import annotations

import logging
import re


_PATTERNS: list[tuple[re.Pattern, str]] = [
    # Bearer / Authorization tokens
    (re.compile(r"(Bearer\s+)[A-Za-z0-9_\-\.]{10,}", re.I), r"\1<redacted>"),
    (re.compile(r"(Authorization:\s*)[^\s,\"']+", re.I), r"\1<redacted>"),

    # JWTs (three dot-separated base64url chunks)
    (re.compile(r"\beyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+"), "<jwt:redacted>"),

    # Password / secret / api key JSON fields (case-insensitive)
    (re.compile(r'(("|\')?(password|new_password|pin|otp|secret|api_key|apikey|access_token|refresh_token|token_hash|jwt_secret|totp_secret)("|\')?\s*[:=]\s*)"([^"]+)"', re.I),
     r'\1"<redacted>"'),
    (re.compile(r'(("|\')?(password|new_password|pin|otp|secret|api_key|apikey|access_token|refresh_token|token_hash|jwt_secret|totp_secret)("|\')?\s*[:=]\s*)(\S+)', re.I),
     r"\1<redacted>"),

    # Cookies
    (re.compile(r"(access_token=)[^;\s]+"), r"\1<redacted>"),
    (re.compile(r"(refresh_token=)[^;\s]+"), r"\1<redacted>"),

    # MongoDB connection strings with embedded credentials
    (re.compile(r"(mongodb(?:\+srv)?://)([^:@/\s]+):([^@/\s]+)@"), r"\1<user>:<pw>@"),
]


class SanitizingFilter(logging.Filter):
    """Redact secrets before a log record reaches any handler."""

    def filter(self, record: logging.LogRecord) -> bool:  # noqa: A003
        try:
            msg = record.getMessage()
            for pat, sub in _PATTERNS:
                msg = pat.sub(sub, msg)
            # Overwrite the pre-formatted message so downstream formatters see it.
            record.msg = msg
            record.args = None
        except Exception:
            pass  # never break logging
        return True


def install_sanitizer(root_logger: logging.Logger | None = None) -> None:
    """Attach SanitizingFilter to the root logger AND uvicorn/fastapi loggers.

    Idempotent — safe to call multiple times.
    """
    f = SanitizingFilter()
    target = root_logger or logging.getLogger()
    if not any(isinstance(x, SanitizingFilter) for x in target.filters):
        target.addFilter(f)
    for name in ("uvicorn", "uvicorn.access", "uvicorn.error", "fastapi", "paisabook", "apka"):
        lg = logging.getLogger(name)
        if not any(isinstance(x, SanitizingFilter) for x in lg.filters):
            lg.addFilter(f)
