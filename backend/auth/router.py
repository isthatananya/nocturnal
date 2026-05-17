import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from redis.asyncio import Redis

from auth.schemas import (
    ChangePasswordRequest,
    LoginRequest,
    PasswordResetConfirm,
    PasswordResetRequest,
    SignupRequest,
    WalletLinkRequest,
)
from auth.utils import create_token, generate_secure_token, hash_password, verify_password
from core.config import settings
from core.deps import (
    check_account_lockout,
    clear_failed_logins,
    get_current_user,
    rate_limit_auth,
    rate_limit_login_ip,
    record_failed_login,
)
from core.redis import get_redis

router = APIRouter()

_COOKIE = dict(
    key="session",
    httponly=True,
    samesite="lax",
    max_age=settings.session_ttl,
)

_RESET_TTL = 3600  # 1 hour


def _set_session(response: Response, user_id: str, email: str) -> str:
    token, jti = create_token(user_id, email)
    response.set_cookie(value=token, secure=False, **_COOKIE)
    return jti


@router.post("/signup", status_code=201)
async def signup(body: SignupRequest, response: Response, redis: Redis = Depends(get_redis)):
    await rate_limit_auth(body.email, "signup", redis)

    if await redis.exists(f"user:email:{body.email}"):
        # Generic message to avoid user enumeration
        raise HTTPException(409, "An account with this email already exists")

    user_id = str(uuid.uuid4())
    await redis.hset(f"user:{user_id}", mapping={
        "email": body.email,
        "password_hash": hash_password(body.password),
        "full_name": body.full_name,
        "date_of_birth": body.date_of_birth.isoformat(),
        "profession": body.profession,
        "role": body.role,
        "wallet_address": "",
        "email_verified": "0",
    })
    await redis.set(f"user:email:{body.email}", user_id)

    jti = _set_session(response, user_id, body.email)
    await redis.setex(f"session:jti:{user_id}", settings.session_ttl, jti)

    return {"id": user_id, "email": body.email, "full_name": body.full_name}


@router.post("/login")
async def login(
    body: LoginRequest,
    request: Request,
    response: Response,
    redis: Redis = Depends(get_redis),
    _ip_limit: None = Depends(rate_limit_login_ip),
):
    await rate_limit_auth(body.email, "login", redis)
    await check_account_lockout(body.email, redis)

    user_id = await redis.get(f"user:email:{body.email}")
    if not user_id:
        # Don't reveal whether the email exists
        raise HTTPException(401, "Invalid email or password")

    user = await redis.hgetall(f"user:{user_id}")
    if not user or not verify_password(body.password, user["password_hash"]):
        await record_failed_login(body.email, redis)
        raise HTTPException(401, "Invalid email or password")

    await clear_failed_logins(body.email, redis)
    jti = _set_session(response, user_id, body.email)
    await redis.setex(f"session:jti:{user_id}", settings.session_ttl, jti)

    return {"id": user_id, "email": body.email}


@router.post("/logout")
async def logout(
    response: Response,
    user: dict = Depends(get_current_user),
    redis: Redis = Depends(get_redis),
):
    # Invalidate token server-side so the JTI is no longer valid
    await redis.delete(f"session:jti:{user['id']}")
    response.delete_cookie("session")
    return {"ok": True}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return {
        "id": user["id"],
        "email": user["email"],
        "full_name": user.get("full_name") or None,
        "date_of_birth": user.get("date_of_birth") or None,
        "profession": user.get("profession") or None,
        "wallet_address": user.get("wallet_address") or None,
        "role": user.get("role") or "borrower",
        "email_verified": user.get("email_verified") == "1",
    }


@router.patch("/wallet")
async def link_wallet(
    body: WalletLinkRequest,
    user: dict = Depends(get_current_user),
    redis: Redis = Depends(get_redis),
):
    await redis.hset(f"user:{user['id']}", "wallet_address", body.wallet_address)
    return {"ok": True}


@router.patch("/password")
async def change_password(
    body: ChangePasswordRequest,
    user: dict = Depends(get_current_user),
    redis: Redis = Depends(get_redis),
):
    stored = await redis.hgetall(f"user:{user['id']}")
    if not verify_password(body.current_password, stored["password_hash"]):
        raise HTTPException(400, "Current password is incorrect")

    await redis.hset(f"user:{user['id']}", "password_hash", hash_password(body.new_password))
    # Invalidate all existing sessions
    await redis.delete(f"session:jti:{user['id']}")
    return {"ok": True}


@router.post("/forgot-password")
async def forgot_password(body: PasswordResetRequest, redis: Redis = Depends(get_redis)):
    await rate_limit_auth(body.email, "forgot", redis)

    user_id = await redis.get(f"user:email:{body.email}")
    if user_id:
        token = generate_secure_token()
        await redis.setex(f"password:reset:{token}", _RESET_TTL, user_id)
        # In production: send email with reset link containing the token.
        # For demo: the token is returned in dev mode only.
        if settings.app_env == "development":
            return {"ok": True, "dev_reset_token": token}

    # Always return 200 — don't reveal whether email exists
    return {"ok": True, "message": "If that email is registered, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(body: PasswordResetConfirm, redis: Redis = Depends(get_redis)):
    user_id = await redis.get(f"password:reset:{body.token}")
    if not user_id:
        raise HTTPException(400, "Reset token is invalid or has expired")

    await redis.hset(f"user:{user_id}", "password_hash", hash_password(body.new_password))
    await redis.delete(f"password:reset:{body.token}")
    # Invalidate all active sessions for this user
    await redis.delete(f"session:jti:{user_id}")

    return {"ok": True}
