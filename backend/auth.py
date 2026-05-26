import logging
import secrets
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, cast

from fastapi import (
    APIRouter,
    BackgroundTasks,
    HTTPException,
    Request,
    Response,
    status,
)

from backend.models import AuthResponse, LoginRequest, SignupRequest, User
from backend.send_email import send_welcome_email

logger = logging.getLogger(__name__)

router = APIRouter()

USERS_DB: dict[str, dict[str, Any]] = {}
SESSIONS = {}
SESSION_TTL_HOURS = 24 * 7


def _create_session(user: User) -> str:
    token = secrets.token_urlsafe(32)
    SESSIONS[token] = {
        "user": user.model_dump(),
        "expires_at": datetime.now() + timedelta(hours=SESSION_TTL_HOURS),
    }
    return token


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="auth_token",
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=60 * 60 * SESSION_TTL_HOURS,
        path="/",
    )


def _auth_response(
    user: User,
    token: str,
    message: str | None = None,
) -> AuthResponse:
    return AuthResponse(
        success=True,
        user=user,
        redirectUrl="/dashboard",
        message=message,
        token=token,
    )


def _resolve_session_token(request: Request) -> str | None:
    token = request.cookies.get("auth_token")
    if token:
        return token

    authorization = request.headers.get("Authorization", "")
    if authorization.lower().startswith("bearer "):
        return authorization.split(" ", 1)[1].strip() or None

    return None


@router.get("/check", response_model=dict)
async def check_auth(request: Request):
    """Verify if user is authenticated."""
    user, _row = get_authenticated_user(request)
    return {"authenticated": True, "user": user.model_dump()}

    session = SESSIONS.get(token)
    if not session:
        return {
            "authenticated": False,
            "message": "Invalid or expired session",
        }

    if session["expires_at"] <= datetime.now():
        SESSIONS.pop(token, None)
        return {"authenticated": False, "message": "Session expired"}

    return {"authenticated": True, "user": session["user"]}


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest, response: Response):
    email = _normalize_email(request.email)
    user_row = query_one(
        "SELECT id, email, name, role, plan, photo_url, password_hash FROM users WHERE email = ?",
        (email,),
    )

    if user_row is None or not verify_password(request.password, user_row["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    execute("UPDATE users SET updated_at = datetime('now') WHERE email = ?", (email,))

    user = _build_user(user_row)
    token = create_session_token(user.model_dump())
    attach_auth_cookie(response, token)

    return AuthResponse(success=True, user=user, redirectUrl="/dashboard", token=token)


@router.post("/signup", response_model=AuthResponse)
async def signup(
    request: SignupRequest,
    background_tasks: BackgroundTasks,
    response: Response,
):
    email = _normalize_email(request.email)
    existing = query_one(
        "SELECT id, email, name, role, plan, photo_url, password_hash FROM users WHERE email = ?",
        (email,),
    )

    if existing is not None:
        if request.password != "google-oauth" and not verify_password(request.password, existing["password_hash"]):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists")

        execute(
            "UPDATE users SET name = ?, plan = COALESCE(?, plan), updated_at = datetime('now') WHERE email = ?",
            (request.name, request.plan or None, email),
        )
        user = User(
            id=existing["id"],
            email=existing["email"],
            name=request.name,
            role=existing["role"],
            plan=request.plan or existing["plan"] or "growth",
        )
    else:
        user_id = stable_user_id(email)
        password_hash = hash_password(request.password)
        execute(
            "INSERT INTO users (id, email, password_hash, name, role, plan, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))",
            (user_id, email, password_hash, request.name, "landlord", request.plan or "growth"),
        )
        user = User(
            id=user_id,
            email=email,
            name=request.name,
            role="landlord",
            plan=request.plan or "growth",
        )

        try:
            background_tasks.add_task(send_welcome_email, user.email, user.name)
        except Exception:
            logger.exception("Failed to schedule welcome email for %s", user.email)

    token = create_session_token(user.model_dump())
    attach_auth_cookie(response, token)

    return AuthResponse(
        success=True,
        user=user,
        redirectUrl="/dashboard",
        message="Account created successfully",
        token=token,
    )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Signup failed",
        )


@router.post("/delete")
async def delete_account(request: Request):
    """Delete user account and associated local data."""
    user, _row = get_authenticated_user(request)

    try:
        body = await request.json()
        email = body.get("email", "")
        logger.info("Delete request for email: %s", email)

        if email and email in USERS_DB:
            del USERS_DB[email]
            logger.info("User %s deleted from USERS_DB", email)

        for token, session in list(SESSIONS.items()):
            if session["user"].get("email") == email:
                SESSIONS.pop(token, None)

        base_dir = Path(__file__).resolve().parents[1]
        data_dir = base_dir / ".data"
        for file_path in [
            data_dir / "properties.json",
            data_dir / "payments.json",
            data_dir / "maintenance.json",
        ]:
            if file_path.exists():
                try:
                    file_path.unlink()
                    logger.info("Deleted data file: %s", file_path)
                except Exception as exc:
                    logger.warning("Failed to delete %s: %s", file_path, exc)

        logger.info(
            (
                "Delete account successful - user %s and all associated data "
                "removed"
            ),
            email,
        )
        return {
            "success": True,
            "message": "Account and all associated data deleted successfully",
        }
    except Exception as exc:
        logger.exception("Delete account error")
        return {"success": False, "error": str(exc)}
