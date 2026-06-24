"""Authentication: password hashing and the bearer-token request dependency.

Passwords are hashed with PBKDF2-HMAC-SHA256 (standard library) and a per-user salt. Login issues an
opaque random token stored in the ``sessions`` table; clients send it as ``Authorization: Bearer
<token>``. No third-party auth libraries are needed.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from . import db

_PBKDF2_ROUNDS = 200_000
_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
    """Return ``(salt, hash_hex)``. Generates a fresh salt when one isn't supplied."""
    if salt is None:
        salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), _PBKDF2_ROUNDS)
    return salt, digest.hex()


def verify_password(password: str, salt: str, expected_hex: str) -> bool:
    """Constant-time check of a password against a stored salt + hash."""
    _, actual_hex = hash_password(password, salt)
    return hmac.compare_digest(actual_hex, expected_hex)


def new_token() -> str:
    """A fresh, URL-safe session token."""
    return secrets.token_urlsafe(32)


def current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict:
    """FastAPI dependency: resolve the bearer token to a user or raise 401."""
    if creds is None or not creds.credentials:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    user = db.get_user_by_token(creds.credentials)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired session")
    return user
