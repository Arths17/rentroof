from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException, Request, status

from backend.db import query_one
from backend.models import User

SESSION_COOKIE = "auth_token"
SESSION_TTL_HOURS = 24 * 7
SESSION_SECRET = os.getenv("AUTH_SESSION_SECRET") or os.getenv("SECRET_KEY") or "rentproof-dev-session-secret"


def _base64url_encode(value: str) -> str:
    return base64.urlsafe_b64encode(value.encode("utf-8")).decode("utf-8").rstrip("=")


def _base64url_decode(value: str) -> str:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(f"{value}{padding}".encode("utf-8")).decode("utf-8")


def _sign(value: str) -> str:
    digest = hmac.new(SESSION_SECRET.encode("utf-8"), value.encode("utf-8"), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(digest).decode("utf-8").rstrip("=")


def hash_password(password: str) -> str:
    salt = secrets.token_urlsafe(16)
    derived_key = hashlib.scrypt(password.encode("utf-8"), salt=salt.encode("utf-8"), n=16384, r=8, p=1, dklen=64)
    return f"scrypt${salt}${base64.urlsafe_b64encode(derived_key).decode('utf-8').rstrip('=')}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, salt, encoded_hash = stored_hash.split("$", 2)
    except ValueError:
        return False

    if algorithm != "scrypt":
        return False

    derived_key = hashlib.scrypt(password.encode("utf-8"), salt=salt.encode("utf-8"), n=16384, r=8, p=1, dklen=64)
    expected = base64.urlsafe_b64encode(derived_key).decode("utf-8").rstrip("=")
    return hmac.compare_digest(expected, encoded_hash)


def stable_user_id(email: str) -> str:
    digest = hashlib.sha256(email.strip().lower().encode("utf-8")).digest()
    return f"user_{base64.urlsafe_b64encode(digest).decode('utf-8').rstrip('=')}"


def create_session_token(user: dict[str, Any]) -> str:
    payload = {
        **user,
        "exp": int((datetime.now(timezone.utc) + timedelta(hours=SESSION_TTL_HOURS)).timestamp() * 1000),
    }
    encoded_payload = _base64url_encode(json.dumps(payload, separators=(",", ":")))
    return f"{encoded_payload}.{_sign(encoded_payload)}"


def verify_session_token(token: str | None) -> dict[str, Any] | None:
    if not token:
        return None

    try:
        encoded_payload, provided_signature = token.split(".", 1)
    except ValueError:
        return None

    if not hmac.compare_digest(_sign(encoded_payload), provided_signature):
        return None

    try:
        payload = json.loads(_base64url_decode(encoded_payload))
    except Exception:
        return None

    if not isinstance(payload, dict) or payload.get("exp", 0) <= int(datetime.now(timezone.utc).timestamp() * 1000):
        return None

    payload.pop("exp", None)
    return payload


def get_session_token_from_request(request: Request) -> str | None:
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        return token

    authorization = request.headers.get("Authorization", "")
    if authorization.lower().startswith("bearer "):
        return authorization.split(" ", 1)[1].strip() or None

    return None


def attach_auth_cookie(response, token: str):
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=60 * 60 * SESSION_TTL_HOURS,
        path="/",
    )
    return response


def clear_auth_cookie(response):
    response.set_cookie(
        key=SESSION_COOKIE,
        value="",
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=0,
        path="/",
    )
    return response


def get_authenticated_user(request: Request, allowed_roles: list[str] | None = None) -> tuple[User, dict[str, Any]]:
    payload = verify_session_token(get_session_token_from_request(request))
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session")

    row = query_one(
        "SELECT id, email, name, role, plan, photo_url FROM users WHERE email = ?",
        (payload["email"],),
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account not found")

    if allowed_roles and row["role"] not in allowed_roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    user = User(
        id=row["id"],
        email=row["email"],
        name=row["name"],
        role=row["role"],
        plan=row["plan"],
    )

    return user, dict(row)
