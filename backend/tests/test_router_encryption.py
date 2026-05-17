"""End-to-end encryption verification: POST /api/score writes ciphertext to Redis,
GET /api/reports/{id} decrypts it back."""

import json

import fakeredis.aioredis
import pytest
from httpx import ASGITransport, AsyncClient

import main as app_module
from core.deps import get_current_user, rate_limit_score
from core.redis import get_redis


_TEST_USER = {"id": "u_test", "email": "test@example.com"}


@pytest.fixture
def fake_redis():
    return fakeredis.aioredis.FakeRedis(decode_responses=True)


@pytest.fixture
def app_with_overrides(fake_redis):
    async def _redis_dep():
        return fake_redis

    async def _user_dep():
        return _TEST_USER

    app_module.app.dependency_overrides[get_redis] = _redis_dep
    app_module.app.dependency_overrides[get_current_user] = _user_dep
    app_module.app.dependency_overrides[rate_limit_score] = _user_dep
    try:
        yield app_module.app
    finally:
        app_module.app.dependency_overrides.clear()


def _sample_score_body() -> dict:
    return {
        "monthly_income": 80000,
        "monthly_emi_obligations": 5000,
        "dpd_max_12m": 0,
        "missed_emi_12m": 0,
        "has_settled_account": False,
        "credit_history_months": 36,
        "hard_inquiries_6m": 1,
        "credit_card_utilization": 0.2,
        "active_loan_accounts": 1,
        "secured_loans_count": 1,
        "employment_type": "salaried",
        "employment_months": 24,
        "bank_bounce_count_12m": 0,
        "itr_filed": True,
        "existing_cibil_score": 760,
        "signed_by": "test",
        "data_source": "form",
    }


def _headers() -> dict:
    return {"X-Nocturned-Request": "1"}


@pytest.mark.asyncio
async def test_score_stores_ciphertext_in_redis(app_with_overrides, fake_redis):
    async with AsyncClient(transport=ASGITransport(app=app_with_overrides), base_url="http://test") as c:
        res = await c.post("/api/score", json=_sample_score_body(), headers=_headers())
    assert res.status_code == 200, res.text
    body = res.json()
    rid = body["report_id"]
    assert body["encrypted_at_rest"] is True
    assert body["encrypted_at_rest_fp"]
    assert body["tier_label"]
    assert "breakdown" in body

    raw = await fake_redis.get(f"report:data:{rid}")
    assert raw is not None
    record = json.loads(raw)
    assert record["encrypted_at_rest"] is True
    assert record["ciphertext"].startswith("v1.")
    assert "tier_label" not in record
    assert "breakdown" not in record
    assert "loan_limit" not in record
    assert "payment_pts" not in raw
    assert record["user_id"] == _TEST_USER["id"]
    assert record["data_source"] == "form"


@pytest.mark.asyncio
async def test_get_report_decrypts(app_with_overrides):
    async with AsyncClient(transport=ASGITransport(app=app_with_overrides), base_url="http://test") as c:
        rid = (await c.post("/api/score", json=_sample_score_body(), headers=_headers())).json()["report_id"]
        res = await c.get(f"/api/reports/{rid}", headers=_headers())
    assert res.status_code == 200
    body = res.json()
    assert body["report_id"] == rid
    assert body["tier_label"]
    assert body["encrypted_at_rest"] is True
    assert "ciphertext" not in body


@pytest.mark.asyncio
async def test_list_reports_decrypts(app_with_overrides):
    async with AsyncClient(transport=ASGITransport(app=app_with_overrides), base_url="http://test") as c:
        rid1 = (await c.post("/api/score", json=_sample_score_body(), headers=_headers())).json()["report_id"]
        rid2 = (await c.post("/api/score", json=_sample_score_body(), headers=_headers())).json()["report_id"]
        res = await c.get("/api/reports", headers=_headers())
    assert res.status_code == 200
    items = res.json()
    ids = {r["report_id"] for r in items}
    assert {rid1, rid2}.issubset(ids)
    for r in items:
        assert "tier_label" in r
        assert "ciphertext" not in r


@pytest.mark.asyncio
async def test_patch_loan_re_encrypts_with_new_fingerprint(app_with_overrides, fake_redis):
    async with AsyncClient(transport=ASGITransport(app=app_with_overrides), base_url="http://test") as c:
        rid = (await c.post("/api/score", json=_sample_score_body(), headers=_headers())).json()["report_id"]
        before = json.loads(await fake_redis.get(f"report:data:{rid}"))
        fp_before = before["encrypted_at_rest_fp"]

        res = await c.patch(f"/api/reports/{rid}/loan", json={"tx_hash": "mid1abc"}, headers=_headers())
        assert res.status_code == 200

        after = json.loads(await fake_redis.get(f"report:data:{rid}"))
        assert after["encrypted_at_rest_fp"] != fp_before
        decrypted = (await c.get(f"/api/reports/{rid}", headers=_headers())).json()
    assert decrypted["loan_applied"] is True
    assert decrypted["loan_tx_hash"] == "mid1abc"


@pytest.mark.asyncio
async def test_legacy_plaintext_report_passes_through(app_with_overrides, fake_redis):
    legacy = {
        "report_id": "rpt_legacy01",
        "user_id": _TEST_USER["id"],
        "score": 720,
        "tier": 3,
        "tier_label": "Gold",
        "loan_limit": 600000,
        "interest_rate": "14",
        "term_months": 36,
        "breakdown": {"payment_pts": 30, "foir_pts": 22, "history_pts": 12,
                      "credit_mix_pts": 11, "inquiry_pts": 9, "adjustment": 0},
        "data_source": "form",
        "generated_at": "2026-04-01T00:00:00+00:00",
        "loan_applied": False,
        "loan_tx_hash": None,
    }
    await fake_redis.set("report:data:rpt_legacy01", json.dumps(legacy))
    await fake_redis.lpush(f"report:history:{_TEST_USER['id']}", "rpt_legacy01")

    async with AsyncClient(transport=ASGITransport(app=app_with_overrides), base_url="http://test") as c:
        res = await c.get("/api/reports/rpt_legacy01", headers=_headers())
    assert res.status_code == 200
    body = res.json()
    assert body["tier_label"] == "Gold"
    assert body.get("encrypted_at_rest") in (False, None)
