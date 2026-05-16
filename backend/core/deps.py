from fastapi import Cookie, Depends, HTTPException, Request
from redis.asyncio import Redis

from auth.utils import decode_token
from core.redis import get_redis

_MAX_LOGIN_ATTEMPTS = 5
_LOCKOUT_TTL = 1800   # 30 min
_ATTEMPT_TTL = 900    # 15 min window
_AUTH_RATE_TTL = 60   # 1 min window
_AUTH_RATE_LIMIT = 10 # requests per minute per endpoint+email


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
    key = f"ratelimit:score:{user['id']}"
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, 60)
    if count > 20:
        raise HTTPException(429, "Rate limit exceeded — 20 score requests per minute.")
    return user


async def rate_limit_auth(email: str, endpoint: str, redis: Redis) -> None:
    """5 auth attempts per minute per email per endpoint."""
    key = f"ratelimit:auth:{endpoint}:{email}"
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, _AUTH_RATE_TTL)
    if count > _AUTH_RATE_LIMIT:
        raise HTTPException(429, "Too many requests — try again in a minute.")


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
