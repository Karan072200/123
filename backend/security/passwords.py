"""
Password hashing + strength validation.

- Hash with **Argon2id** (winner of the Password Hashing Competition).
- Verify Argon2 primarily; fall back to bcrypt for legacy users still on the
  old scheme, then transparently rehash them to Argon2 on next login (see
  `needs_rehash`).
- Reject weak passwords at signup / reset with a strength policy tuned for
  a financial ERP: length, character variety, and a small deny-list of the
  most common leaked passwords.
"""
from __future__ import annotations

import re
from typing import Optional

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError
import bcrypt


_PH = PasswordHasher(
    time_cost=2,        # ~50-80 ms on a Railway CPU — good UX + strong security
    memory_cost=64 * 1024,  # 64 MB
    parallelism=2,
    hash_len=32,
    salt_len=16,
)


def hash_password(pw: str) -> str:
    """Hash a plaintext password with Argon2id."""
    if not isinstance(pw, str) or not pw:
        raise ValueError("Password must be a non-empty string")
    return _PH.hash(pw)


def verify_password(pw: str, stored_hash: str) -> bool:
    """Verify against Argon2 OR legacy bcrypt hashes.

    Bcrypt hashes look like `$2a$…` / `$2b$…` / `$2y$…`; Argon2 hashes look
    like `$argon2id$…`.
    """
    if not stored_hash:
        return False
    try:
        if stored_hash.startswith("$argon2"):
            _PH.verify(stored_hash, pw)
            return True
        if stored_hash.startswith("$2"):
            return bcrypt.checkpw(pw.encode("utf-8"), stored_hash.encode("utf-8"))
    except (VerifyMismatchError, InvalidHashError, ValueError):
        return False
    return False


def needs_rehash(stored_hash: str) -> bool:
    """Return True if the stored hash should be upgraded to a fresh Argon2 hash.

    Callers should re-hash the plaintext (only known immediately after a
    successful verify) and update the DB when this returns True.
    """
    if not stored_hash:
        return True
    if stored_hash.startswith("$2"):
        return True  # legacy bcrypt — always upgrade
    try:
        return _PH.check_needs_rehash(stored_hash)
    except Exception:
        return True


# ------------------------------------------------------------------ strength

# Bare-minimum deny-list. Kept short; the real defence is length + variety.
_COMMON_PASSWORDS = {
    "password", "12345678", "123456789", "1234567890", "qwerty12",
    "qwertyuiop", "abcdef12", "iloveyou1", "welcome1", "admin1234",
    "letmein12", "monkey12", "football1", "apkamunim", "apka1234",
    "test1234", "changeme", "password1", "password123",
}

# Minimum length is a security-vs-usability trade-off. 10 is a good baseline
# for a business ERP with 2FA available. Consumer apps often go with 8.
MIN_PASSWORD_LENGTH = 10
MAX_PASSWORD_LENGTH = 128


class WeakPasswordError(ValueError):
    """Raised by validate_password_strength when the password fails policy."""


def validate_password_strength(pw: str, email: Optional[str] = None) -> None:
    """Raise WeakPasswordError if the password violates policy.

    Policy:
      - length 10..128
      - at least 3 of the 4 character classes (lower, upper, digit, symbol)
      - not in the deny-list
      - not equal to the user's email local-part (case-insensitive)
    """
    if not isinstance(pw, str):
        raise WeakPasswordError("Password must be a string")
    if len(pw) < MIN_PASSWORD_LENGTH:
        raise WeakPasswordError(f"Password must be at least {MIN_PASSWORD_LENGTH} characters")
    if len(pw) > MAX_PASSWORD_LENGTH:
        raise WeakPasswordError(f"Password must be at most {MAX_PASSWORD_LENGTH} characters")

    lowered = pw.lower()
    if lowered in _COMMON_PASSWORDS:
        raise WeakPasswordError("Password is too common — please choose a stronger one")

    if email and "@" in email:
        local = email.split("@", 1)[0].lower()
        if local and local in lowered:
            raise WeakPasswordError("Password must not contain your email")

    classes = 0
    if re.search(r"[a-z]", pw): classes += 1
    if re.search(r"[A-Z]", pw): classes += 1
    if re.search(r"\d", pw): classes += 1
    if re.search(r"[^A-Za-z0-9]", pw): classes += 1
    if classes < 3:
        raise WeakPasswordError(
            "Password must contain at least 3 of: lowercase, uppercase, digit, symbol"
        )
