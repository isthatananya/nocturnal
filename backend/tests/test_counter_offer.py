"""Counter-offer flow: bank counters a pending request, borrower accepts/declines.

These tests use fakeredis and override the auth dependency to switch between
borrower and bank roles. They cover the new `countered` status added in
banks/schemas.py and the borrower-side response endpoint.
"""

import fakeredis.aioredis
import pytest
from httpx import ASGITransport, AsyncClient

import main as app_module
from core.deps import get_current_user, rate_limit_score
from core.redis import get_redis


_BORROWER = {"id": "u_borrower", "email": "b@test.com", "role": "borrower"}
_BANK = {"id": "u_bank", "email": "officer@test.com", "role": "bank", "bank_id": "neon_bank"}


@pytest.fixture
def fake_redis():
    return fakeredis.aioredis.FakeRedis(decode_responses=True)


@pytest.fixture
def app_factory(fake_redis):
    """Returns a helper to mount the app with a chosen user role."""

    async def _redis_dep():
        return fake_redis

    def _mount(user: dict):
        async def _user_dep():
            return user

        app_module.app.dependency_overrides[get_redis] = _redis_dep
        app_module.app.dependency_overrides[get_current_user] = _user_dep
        app_module.app.dependency_overrides[rate_limit_score] = _user_dep
        return app_module.app

    yield _mount
    app_module.app.dependency_overrides.clear()


def _headers() -> dict:
    return {"X-ZKCredit-Request": "1"}


async def _seed_request(client: AsyncClient) -> str:
    """Borrower submits a loan request. Returns request_id."""
    res = await client.post(
        "/api/loan-requests",
        headers=_headers(),
        json={
            "bank_id": "neon_bank",
            "report_id": "rep_test",
            "amount": 500000,
            "score": 750,
            "tier": 3,
            "tier_label": "Gold",
        },
    )
    assert res.status_code == 201, res.text
    return res.json()["request_id"]


@pytest.mark.asyncio
async def test_bank_can_counter_pending_request(app_factory):
    # Borrower submits
    app = app_factory(_BORROWER)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        rid = await _seed_request(c)

    # Bank counters
    app = app_factory(_BANK)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        res = await c.patch(
            f"/api/loan-requests/{rid}",
            headers=_headers(),
            json={
                "status": "countered",
                "message": "We can offer ₹4L at 15% over 36 months.",
                "counter_amount": 400000,
                "counter_rate": 15.0,
                "counter_term_months": 36,
            },
        )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["status"] == "countered"
    assert body["counter_amount"] == 400000
    assert body["counter_rate"] == 15.0
    assert body["counter_term_months"] == 36


@pytest.mark.asyncio
async def test_counter_requires_at_least_one_revised_term(app_factory):
    app = app_factory(_BORROWER)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        rid = await _seed_request(c)

    app = app_factory(_BANK)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        res = await c.patch(
            f"/api/loan-requests/{rid}",
            headers=_headers(),
            json={"status": "countered", "message": "no terms"},
        )
    assert res.status_code == 400, res.text


@pytest.mark.asyncio
async def test_borrower_accepts_counter_applies_new_amount(app_factory):
    app = app_factory(_BORROWER)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        rid = await _seed_request(c)

    # Bank counters with a reduced amount
    app = app_factory(_BANK)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        await c.patch(
            f"/api/loan-requests/{rid}",
            headers=_headers(),
            json={"status": "countered", "counter_amount": 350000},
        )

    # Borrower accepts
    app = app_factory(_BORROWER)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        res = await c.post(
            f"/api/loan-requests/{rid}/counter-response",
            headers=_headers(),
            json={"decision": "accepted"},
        )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["status"] == "approved"
    assert body["amount"] == 350000   # the counter amount becomes the final amount


@pytest.mark.asyncio
async def test_borrower_declines_counter_marks_rejected(app_factory):
    app = app_factory(_BORROWER)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        rid = await _seed_request(c)

    app = app_factory(_BANK)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        await c.patch(
            f"/api/loan-requests/{rid}",
            headers=_headers(),
            json={"status": "countered", "counter_rate": 18.0},
        )

    app = app_factory(_BORROWER)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        res = await c.post(
            f"/api/loan-requests/{rid}/counter-response",
            headers=_headers(),
            json={"decision": "declined"},
        )
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "rejected"


@pytest.mark.asyncio
async def test_cannot_counter_a_terminal_request(app_factory):
    app = app_factory(_BORROWER)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        rid = await _seed_request(c)

    # Approve it once
    app = app_factory(_BANK)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        await c.patch(f"/api/loan-requests/{rid}", headers=_headers(), json={"status": "approved"})

        # Now try to counter — should 409
        res = await c.patch(
            f"/api/loan-requests/{rid}",
            headers=_headers(),
            json={"status": "countered", "counter_amount": 100000},
        )
    assert res.status_code == 409
