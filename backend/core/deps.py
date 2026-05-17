from fastapi import Cookie, Depends, HTTPException, Request
from redis.asyncio import Redis

from auth.utils import decode_token
from core.redis import get_redis

_MAX_LOGIN_ATTEMPTS = 5
_LOCKOUT_TTL = 1800   # 30 min
_ATTEMPT_TTL = 900    # 15 min window
_AUTH_RATE_TTL = 60   # 1 min window
_AUTH_RATE_LIMIT = 10 # requests per minute per endpoint+email

# Rate-limit tuning per the v2 product spec
_SCORE_WINDOW_SEC = 3600     # 1 hour
_SCORE_LIMIT = 10            # 10 scores / hour / user
_LOGIN_IP_WINDOW_SEC = 900   # 15 minutes
_LOGIN_IP_LIMIT = 5          # 5 login attempts / 15 min / IP
_LOAN_APPLY_WINDOW_SEC = 86400  # 24 hours
_LOAN_APPLY_LIMIT = 3        # 3 applications / 24h / borrower / bank


async def _check_fixed_window(
    redis: Redis,
    key: str,
    limit: int,
    window_sec: int,
    error_message: str,
) -> None:
    """Fixed-window counter. Increments key, sets TTL on first hit, raises 429
    with Retry-After when the counter exceeds the limit.

    Not strict sliding window (allows up to 2× limit across a window boundary)
    but adequate for application-layer abuse prevention and trivially cheap.
    """
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, window_sec)
    if count > limit:
        retry_after = await redis.ttl(key)
        if retry_after is None or retry_after < 0:
            retry_after = window_sec
        raise HTTPException(
            429,
            error_message,
            headers={"Retry-After": str(retry_after)},
        )


async def get_current_user(
    session: str | None = Cookie(default=None),
    redis: Redis = Depends(get_redis),
) -> dict:
    if not session:
        raise HTTPException(401, "Not authenticated")

    payload = decode_token(session)
    if not payload:
        raise HTTPException(401, "Invalid session")

    user_id = payload["sub"]
    jti = payload.get("jti")

    # Verify this token hasn't been revoked (server-side logout)
    stored_jti = await redis.get(f"session:jti:{user_id}")
    if not stored_jti or stored_jti != jti:
        raise HTTPException(401, "Session expired — please log in again")

    user = await redis.hgetall(f"user:{user_id}")
    if not user:
        raise HTTPException(401, "User not found")

    return {"id": user_id, **user}


async def rate_limit_score(
    user: dict = Depends(get_current_user),
    redis: Redis = Depends(get_redis),
) -> dict:
    """10 score computations per hour per user."""
    await _check_fixed_window(
        redis,
        f"ratelimit:score:{user['id']}",
        _SCORE_LIMIT,
        _SCORE_WINDOW_SEC,
        f"Score rate limit reached ({_SCORE_LIMIT} per hour). Wait and try again.",
    )
    return user


async def rate_limit_login_ip(request: Request, redis: Redis = Depends(get_redis)) -> None:
    """5 login attempts per 15 minutes per source IP.

    Honours `X-Forwarded-For` first (when behind a trusted reverse proxy);
    falls back to the direct client address. Apply alongside the existing
    per-email lockout — they defend against different attack shapes.
    """
    ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    if not ip and request.client:
        ip = request.client.host
    if not ip:
        return  # unknown client, skip (better than incorrectly limiting)
    await _check_fixed_window(
        redis,
        f"ratelimit:login_ip:{ip}",
        _LOGIN_IP_LIMIT,
        _LOGIN_IP_WINDOW_SEC,
        "Too many login attempts from this network. Wait 15 minutes.",
    )


async def rate_limit_loan_apply(
    bank_id: str,
    user: dict,
    redis: Redis,
) -> None:
    """3 loan applications per 24 hours per (user, bank) pair."""
    await _check_fixed_window(
        redis,
        f"ratelimit:loan_apply:{user['id']}:{bank_id}",
        _LOAN_APPLY_LIMIT,
        _LOAN_APPLY_WINDOW_SEC,
        f"You've reached the {_LOAN_APPLY_LIMIT}-per-day application cap for this lender.",
    )


async def rate_limit_auth(email: str, endpoint: str, redis: Redis) -> None:
    """5 auth attempts per minute per email per endpoint."""
    await _check_fixed_window(
        redis,
        f"ratelimit:auth:{endpoint}:{email}",
        _AUTH_RATE_LIMIT,
        _AUTH_RATE_TTL,
        "Too many requests — try again in a minute.",
    )


async def check_account_lockout(email: str, redis: Redis) -> None:
    locked = await redis.get(f"login:lockout:{email}")
    if locked:
        raise HTTPException(403, "Account temporarily locked due to too many failed login attempts. Try again in 30 minutes.")


async def record_failed_login(email: str, redis: Redis) -> None:
    key = f"login:attempts:{email}"
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, _ATTEMPT_TTL)
    if count >= _MAX_LOGIN_ATTEMPTS:
        await redis.setex(f"login:lockout:{email}", _LOCKOUT_TTL, "1")
        await redis.delete(key)


async def clear_failed_logins(email: str, redis: Redis) -> None:
    await redis.delete(f"login:attempts:{email}")
    await redis.delete(f"login:lockout:{email}")
