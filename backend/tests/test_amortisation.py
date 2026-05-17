"""Unit + integration tests for the EMI schedule and repayment flow."""

from datetime import date

import fakeredis.aioredis
import pytest
from httpx import ASGITransport, AsyncClient

import main as app_module
from core.deps import get_current_user, rate_limit_score
from core.redis import get_redis
from credit.amortisation import generate_schedule


# ── Pure-function tests ─────────────────────────────────────────────────────


def test_schedule_zero_principal_returns_empty():
    s = generate_schedule(principal=0, apr=14.0, term_months=12)
    assert s.rows == []
    assert s.fully_repaid is True


def test_schedule_zero_apr_splits_principal_equally():
    s = generate_schedule(principal=120000, apr=0.0, term_months=12, start_date=date(2026, 1, 15))
    assert s.emi == 10000
    assert s.total_interest == 0
    assert len(s.rows) == 12
    # Final balance must hit zero
    assert s.rows[-1].balance == 0


def test_schedule_standard_annuity_math():
    # ₹100k at 14% APR over 12 months → EMI ~₹8979 (well-known reference value)
    s = generate_schedule(principal=100000, apr="14.0%", term_months=12, start_date=date(2026, 1, 15))
    assert 8970 <= s.emi <= 8990, f"unexpected EMI: {s.emi}"
    assert len(s.rows) == 12
    # Total paid > principal because of interest
    assert s.emi * 12 > 100000
    # Last row balance rounds to zero (within ₹1)
    assert s.rows[-1].balance <= 1


def test_schedule_paid_count_marks_rows_paid():
    s = generate_schedule(principal=120000, apr=0.0, term_months=12,
                          start_date=date(2026, 1, 1), paid_count=4,
                          today=date(2026, 6, 1))
    assert s.paid_count == 4
    assert s.fully_repaid is False
    assert [r.status for r in s.rows[:4]] == ["paid"] * 4
    # The 5th EMI was due 2026-06-01 = today → "due"
    assert s.rows[4].status == "due"


def test_schedule_overdue_rows_flagged():
    s = generate_schedule(principal=120000, apr=0.0, term_months=12,
                          start_date=date(2026, 1, 1), paid_count=0,
                          today=date(2026, 5, 15))
    # EMIs 1-4 (Feb-May) were before today and unpaid → overdue
    overdue = [r for r in s.rows if r.status == "overdue"]
    assert len(overdue) == 4


def test_schedule_fully_repaid_when_paid_equals_term():
    s = generate_schedule(principal=12000, apr=12.0, term_months=12, paid_count=12)
    assert s.fully_repaid is True
    assert all(r.status == "paid" for r in s.rows)


# ── Integration tests through the FastAPI router ────────────────────────────


_USER = {"id": "u_amort_test", "email": "a@test.com"}


@pytest.fixture
def fake_redis():
    return fakeredis.aioredis.FakeRedis(decode_responses=True)


@pytest.fixture
def app(fake_redis):
    async def _redis_dep():
        return fake_redis

    async def _user_dep():
        return _USER

    app_module.app.dependency_overrides[get_redis] = _redis_dep
    app_module.app.dependency_overrides[get_current_user] = _user_dep
    app_module.app.dependency_overrides[rate_limit_score] = _user_dep
    yield app_module.app
    app_module.app.dependency_overrides.clear()


def _headers() -> dict:
    return {"X-Nocturned-Request": "1"}


def _score_body() -> dict:
    return {
        "monthly_income": 80000, "monthly_emi_obligations": 5000,
        "dpd_max_12m": 0, "missed_emi_12m": 0, "has_settled_account": False,
        "credit_history_months": 36, "hard_inquiries_6m": 1,
        "credit_card_utilization": 0.2, "active_loan_accounts": 1,
        "secured_loans_count": 1, "employment_type": "salaried",
        "employment_months": 24, "bank_bounce_count_12m": 0,
        "itr_filed": True, "existing_cibil_score": 760,
        "signed_by": "test", "data_source": "form",
    }


@pytest.mark.asyncio
async def test_schedule_requires_loan_applied(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        rid = (await c.post("/api/score", json=_score_body(), headers=_headers())).json()["report_id"]
        # Schedule before loan applied → 400
        res = await c.get(f"/api/reports/{rid}/schedule", headers=_headers())
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_schedule_after_loan_applied_returns_rows(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        rid = (await c.post("/api/score", json=_score_body(), headers=_headers())).json()["report_id"]
        await c.patch(f"/api/reports/{rid}/loan", json={"tx_hash": "mid1abc"}, headers=_headers())
        res = await c.get(f"/api/reports/{rid}/schedule", headers=_headers())
    assert res.status_code == 200
    body = res.json()
    assert body["report_id"] == rid
    assert body["term_months"] > 0
    assert len(body["rows"]) == body["term_months"]
    assert body["emi"] > 0
    assert body["paid_count"] == 0
    assert body["fully_repaid"] is False


@pytest.mark.asyncio
async def test_repay_marks_next_emi_paid(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        rid = (await c.post("/api/score", json=_score_body(), headers=_headers())).json()["report_id"]
        await c.patch(f"/api/reports/{rid}/loan", json={"tx_hash": "mid1abc"}, headers=_headers())
        first = await c.post(f"/api/reports/{rid}/repay", json={"tx_hash": "mid1emi1"}, headers=_headers())
    assert first.status_code == 200
    body = first.json()
    assert body["paid_emi_count"] == 1
    assert body["loan_repaid"] is False


@pytest.mark.asyncio
async def test_repay_until_complete_flips_loan_repaid(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        rid = (await c.post("/api/score", json=_score_body(), headers=_headers())).json()["report_id"]
        await c.patch(f"/api/reports/{rid}/loan", json={"tx_hash": "mid1abc"}, headers=_headers())
        sched = (await c.get(f"/api/reports/{rid}/schedule", headers=_headers())).json()
        for _ in range(sched["term_months"]):
            res = await c.post(f"/api/reports/{rid}/repay", headers=_headers())
            assert res.status_code == 200
        # One more should 409
        extra = await c.post(f"/api/reports/{rid}/repay", headers=_headers())
    assert extra.status_code == 409
    final = res.json()
    assert final["loan_repaid"] is True
