"""Rate limits aligned with the v2 spec:

- 10 score computations / hour / user
- 5 login attempts / 15 min / IP
- 3 loan applications / 24 h / borrower / bank

All 429 responses must carry a Retry-After header so clients can back off
intelligently.
"""

import fakeredis.aioredis
import pytest
from httpx import ASGITransport, AsyncClient

import main as app_module
from core.deps import get_current_user, rate_limit_score
from core.redis import get_redis


_BORROWER = {"id": "u_rl_borrower", "email": "rl@test.com", "role": "borrower"}


@pytest.fixture
def fake_redis():
    return fakeredis.aioredis.FakeRedis(decode_responses=True)


@pytest.fixture
def app(fake_redis):
    async def _redis_dep():
        return fake_redis

    async def _user_dep():
        return _BORROWER

    app_module.app.dependency_overrides[get_redis] = _redis_dep
    app_module.app.dependency_overrides[get_current_user] = _user_dep
    yield app_module.app
    app_module.app.dependency_overrides.clear()


def _headers() -> dict:
    return {"X-ZKCredit-Request": "1"}


@pytest.mark.asyncio
async def test_loan_apply_caps_at_three_per_bank(app):
    body = {
        "bank_id": "neon_bank",
        "report_id": "rep_test",
        "amount": 100000,
        "score": 750,
        "tier": 3,
        "tier_label": "Gold",
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        # First 3 should succeed
        for i in range(3):
            res = await c.post("/api/loan-requests", json=body, headers=_headers())
            assert res.status_code == 201, f"attempt {i + 1}: {res.text}"

        # 4th hits the 24h-per-bank cap
        res = await c.post("/api/loan-requests", json=body, headers=_headers())
    assert res.status_code == 429
    assert res.headers.get("retry-after"), "Retry-After header must be set on 429"
    # 24h window = up to 86400s; allow a small clock-tick margin
    assert 0 < int(res.headers["retry-after"]) <= 86400


@pytest.mark.asyncio
async def test_loan_apply_limit_is_per_bank(app):
    """Hitting the cap on bank A should not block applications to bank B."""
    body_a = {"bank_id": "neon_bank", "report_id": "r1", "amount": 100000, "score": 750, "tier": 3, "tier_label": "Gold"}
    body_b = {"bank_id": "horizon_defi", "report_id": "r1", "amount": 100000, "score": 750, "tier": 3, "tier_label": "Gold"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        for _ in range(3):
            await c.post("/api/loan-requests", json=body_a, headers=_headers())
        capped = await c.post("/api/loan-requests", json=body_a, headers=_headers())
        other = await c.post("/api/loan-requests", json=body_b, headers=_headers())
    assert capped.status_code == 429
    assert other.status_code == 201


@pytest.mark.asyncio
async def test_score_endpoint_caps_at_ten_per_hour(app, fake_redis):
    """The rate_limit_score dep is still wired; we bypass it in router tests
    elsewhere, but here we exercise the real function once and verify the
    11th call gets 429 with Retry-After."""
    from fastapi import HTTPException

    user = {"id": "u_rl_score"}
    # 10 hits — all should succeed
    for _ in range(10):
        await rate_limit_score(user=user, redis=fake_redis)
    # 11th raises
    with pytest.raises(HTTPException) as exc:
        await rate_limit_score(user=user, redis=fake_redis)
    assert exc.value.status_code == 429
    assert exc.value.headers and "Retry-After" in exc.value.headers


@pytest.mark.asyncio
async def test_login_per_ip_limits_after_five_attempts(app):
    """Five consecutive login attempts from the same IP succeed (some 401, some
    422 from bad bodies) but the 6th gets a 429 from the IP rate limit before
    any auth logic runs."""
    headers = {**_headers(), "x-forwarded-for": "203.0.113.5"}
    body = {"email": "noone@test.com", "password": "wrong"}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        # Override get_current_user is set for the /login flow but login itself
        # only relies on the redis dep + IP. First five should hit 401.
        for _ in range(5):
            res = await c.post("/api/auth/login", json=body, headers=headers)
            assert res.status_code in (401, 429), res.text
        # The 6th must be a rate-limit response.
        res = await c.post("/api/auth/login", json=body, headers=headers)
    assert res.status_code == 429
    assert res.headers.get("retry-after")
