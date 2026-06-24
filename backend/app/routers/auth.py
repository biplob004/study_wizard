"""Account routes: register, login, logout, and the current user.

Thin HTTP layer — password hashing lives in ``app.auth`` and persistence in ``app.db``.
"""

from __future__ import annotations

import sqlite3

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .. import auth, db
from ..schemas import AuthResponse, LoginRequest, RegisterRequest, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])

_bearer = HTTPBearer(auto_error=False)


def to_user_out(user: dict) -> UserOut:
    """Project a stored user row to the public response shape (no password fields)."""
    return UserOut(id=user["id"], email=user["email"], display_name=user["display_name"])


def _issue_session(user: dict) -> AuthResponse:
    """Mint a session token for a user and return it with the public profile."""
    token = auth.new_token()
    db.create_session(token, user["id"])
    return AuthResponse(token=token, user=to_user_out(user))


@router.post("/register", response_model=AuthResponse)
def register(req: RegisterRequest) -> AuthResponse:
    email = req.email.strip().lower()
    if "@" not in email:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Please enter a valid email address")
    salt, password_hash = auth.hash_password(req.password)
    display_name = req.display_name.strip() or email.split("@")[0]
    try:
        user = db.create_user(email, display_name, password_hash, salt)
    except sqlite3.IntegrityError:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")
    return _issue_session(user)


@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest) -> AuthResponse:
    user = db.get_user_by_email(req.email.strip().lower())
    if user is None or not auth.verify_password(req.password, user["salt"], user["password_hash"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    return _issue_session(user)


@router.get("/me", response_model=UserOut)
def me(user: dict = Depends(auth.current_user)) -> UserOut:
    return to_user_out(user)


@router.post("/logout")
def logout(creds: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> dict[str, str]:
    """Invalidate the current session token (no error if it's already gone)."""
    if creds and creds.credentials:
        db.delete_session(creds.credentials)
    return {"status": "ok"}
