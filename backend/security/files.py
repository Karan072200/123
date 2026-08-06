"""
File upload validation.

Even though the current codebase has few user uploads (PDF export is generated
server-side), any future upload path (invoice logos, expense receipts, avatars)
MUST go through validate_upload() to guarantee that we never persist:

    - Executables (.exe, .msi, .sh, .bat, .cmd, .ps1, .app)
    - Scripts / server-side templates (.php, .jsp, .asp, .py, .rb, .pl)
    - Files whose extension disagrees with their actual content (magic bytes)
    - Files larger than the module's MAX_UPLOAD_BYTES limit

Design:
    - Extension check (deny-list + allow-list)
    - Magic-byte sniff (PNG/JPEG/PDF/DOC/XLS)
    - Configurable size cap
    - Random safe filename generator (never trust user filename)
"""
from __future__ import annotations

import os
import re
import uuid
from typing import Optional

# Default 10 MB — override via UPLOAD_MAX_MB env at boot.
MAX_UPLOAD_BYTES = int(os.environ.get("UPLOAD_MAX_MB", "10")) * 1024 * 1024

# Extensions we NEVER accept.
DANGEROUS_EXTENSIONS = {
    ".exe", ".msi", ".dll", ".bat", ".cmd", ".ps1", ".vbs", ".sh", ".bash", ".zsh",
    ".php", ".php3", ".php4", ".phtml", ".jsp", ".jspx", ".asp", ".aspx",
    ".py", ".pyc", ".pyo", ".rb", ".pl", ".cgi",
    ".jar", ".war", ".ear", ".class",
    ".app", ".apk", ".dmg", ".pkg", ".deb", ".rpm",
    ".htaccess", ".config",
    ".svg",   # SVG can contain JS
    ".html", ".htm", ".xhtml",  # can carry XSS
}

# Extensions we DO accept per category.
ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
ALLOWED_DOCUMENT_EXTENSIONS = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt"}

# Magic byte signatures (leading bytes) for common accepted formats.
_MAGIC = [
    (b"\x89PNG\r\n\x1a\n", "image/png",   {".png"}),
    (b"\xff\xd8\xff",       "image/jpeg",  {".jpg", ".jpeg"}),
    (b"GIF87a",             "image/gif",   {".gif"}),
    (b"GIF89a",             "image/gif",   {".gif"}),
    (b"RIFF",               "image/webp",  {".webp"}),  # further check needed
    (b"%PDF-",              "application/pdf", {".pdf"}),
    (b"PK\x03\x04",         "application/zip", {".docx", ".xlsx", ".pptx", ".zip"}),
    (b"\xd0\xcf\x11\xe0",   "application/msword", {".doc", ".xls", ".ppt"}),
]


class InvalidUploadError(ValueError):
    """Raised when the uploaded file fails validation."""


def _safe_extension(filename: str) -> str:
    _, ext = os.path.splitext(filename or "")
    return ext.lower().strip()


def _detect_mime(head: bytes) -> Optional[tuple[str, set[str]]]:
    """Return (mime, allowed_exts) if a known magic byte matches, else None."""
    for sig, mime, exts in _MAGIC:
        if head.startswith(sig):
            # Special-case WebP: RIFF is generic — check bytes 8..12 are "WEBP"
            if sig == b"RIFF":
                if len(head) >= 12 and head[8:12] == b"WEBP":
                    return "image/webp", {".webp"}
                continue
            return mime, exts
    return None


def validate_upload(
    *,
    filename: str,
    content: bytes,
    allowed_extensions: Optional[set[str]] = None,
    max_bytes: Optional[int] = None,
) -> dict:
    """Validate an uploaded blob.

    Returns a dict with the safe filename to use for storage:
        {"filename": "9f8ee2ab.pdf", "mime": "application/pdf", "size": 123}

    Raises InvalidUploadError with a user-safe message on failure.
    """
    if not filename:
        raise InvalidUploadError("Filename is required")

    ext = _safe_extension(filename)
    if ext in DANGEROUS_EXTENSIONS:
        raise InvalidUploadError(f"File type {ext!r} not allowed")

    if allowed_extensions is not None and ext not in allowed_extensions:
        raise InvalidUploadError(f"Only {sorted(allowed_extensions)} files are accepted")

    cap = max_bytes if max_bytes is not None else MAX_UPLOAD_BYTES
    if len(content) > cap:
        raise InvalidUploadError(f"File too large — max {cap // 1024 // 1024} MB")

    if not content:
        raise InvalidUploadError("Empty file")

    head = content[:16]
    detected = _detect_mime(head)
    if detected is None:
        # Text-like files (CSV, TXT) don't have a magic sig. Only accept if the
        # extension is a plain-text one AND the content is ASCII-safe-ish.
        if ext in (".csv", ".txt"):
            # Reject NUL bytes early (would suggest binary trying to sneak through)
            if b"\x00" in content[:2048]:
                raise InvalidUploadError("Text file must not contain NUL bytes")
            mime = "text/plain" if ext == ".txt" else "text/csv"
            return {"filename": _random_name(ext), "mime": mime, "size": len(content)}
        raise InvalidUploadError("Unrecognised file format")

    mime, mime_exts = detected
    if ext not in mime_exts:
        raise InvalidUploadError(f"File content does not match extension {ext}")

    return {"filename": _random_name(ext), "mime": mime, "size": len(content)}


def _random_name(ext: str) -> str:
    # Never trust the user's filename — generate a fresh random one.
    return f"{uuid.uuid4().hex}{ext}"


_UNSAFE_FILENAME = re.compile(r"[^A-Za-z0-9._-]+")


def sanitize_filename(name: str) -> str:
    """Return a filesystem-safe version of *name* preserving the extension.

    Used when we WANT to keep some semblance of the original name (e.g. for
    display) but must strip path traversal + shell chars.
    """
    base = os.path.basename(name or "")
    base = _UNSAFE_FILENAME.sub("_", base)
    return base or "file"
