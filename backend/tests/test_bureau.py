"""Bureau client abstraction + /api/bureau/pan-lookup endpoint."""

import fakeredis.aioredis
import pytest
from httpx import ASGITransport, AsyncClient

import main as app_module
from core.deps import get_current_user
from core.redis import get_redis
from credit.bureau import (
    CibilClient,
    MockBureauClient,
    PAN_RE,
    get_bureau_client,
    pan_cache_key,
    validate_pan,
)


# ── Pure-function tests ─────────────────────────────────────────────────────


def test_pan_regex_matches_valid_format():
    assert PAN_RE.match("ABCDE1234F")
    assert PAN_RE.match("AAAPL1234C")


def test_pan_regex_rejects_invalid():
    for bad in ["", "ABCDE1234", "ABCDE12345", "abcde1234f", "ABCD1234FG", "12345ABCDE"]:
        assert not PAN_RE.match(bad), bad


def test_validate_pan_normalises_case_and_whitespace():
    assert validate_pan(" abcde1234f ") == "ABCDE1234F"


def test_validate_pan_raises_on_garbage():
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc:
        validate_pan("not-a-pan")
    assert exc.value.status_code == 400


def test_pan_cache_key_is_stable_per_secret():
    a1 = pan_cache_key("ABCDE1234F", "secret-a")
    a2 = pan_cache_key("ABCDE1234F", "secret-a")
    b = pan_cache_key("ABCDE1234F", "secret-b")
    assert a1 == a2
    assert a1 != b              # different secret → different key
    assert "ABCDE1234F" not in a1   # PAN must not leak into the key


@pytest.mark.asyncio
async def test_mock_client_returns_feature_vector_shape():
    client = MockBureauClient()
    profile = await client.lookup("ABCDE1234F")
    # Profile must expose every field the FeatureVector type requires.
    for required in [
        "monthly_income", "monthly_emi_obligations", "dpd_max_12m",
        "missed_emi_12m", "has_settled_account", "credit_history_months",
        "hard_inquiries_6m", "credit_card_utilization", "active_loan_accounts",
        "secured_loans_count", "employment_type", "employment_months",
        "bank_bounce_count_12m", "itr_filed", "existing_cibil_score",
    ]:
        assert required in profile, f"missing field: {required}"
    assert profile["data_source"] == "pan"
    assert profile["signed_by"] == "Synthetic_Bureau"


@pytest.mark.asyncio
async def test_mock_client_deterministic_lookup():
    """Same PAN → same profile, always."""
    client = MockBureauClient()
    a = await client.lookup("ABCDE1234F")
    b = await client.lookup("ABCDE1234F")
    assert a == b


@pytest.mark.asyncio
async def test_cibil_client_raises_501_without_credentials():
    from fastapi import HTTPException

    client = CibilClient(base_url=None, api_key=None)
    with pytest.raises(HTTPException) as exc:
        await client.lookup("ABCDE1234F")
    assert exc.value.status_code == 501


def test_factory_picks_mock_by_default():
    class S: bureau_provider = "mock"
    assert isinstance(get_bureau_client(S()), MockBureauClient)


def test_factory_picks_cibil_when_configured():
    class S:
        bureau_provider = "cibil"
        cibil_api_base_url = "https://bureau.example/v1"
        cibil_api_key = "test"
    assert isinstance(get_bureau_client(S()), CibilClient)


# ── Endpoint integration ────────────────────────────────────────────────────


_USER = {"id": "u_bureau_test", "email": "b@test.com"}


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
    yield app_module.app
    app_module.app.dependency_overrides.clear()


def _headers() -> dict:
    return {"X-ZKCredit-Request": "1"}


@pytest.mark.asyncio
async def test_pan_lookup_returns_feature_vector(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        res = await c.post("/api/bureau/pan-lookup", json={"pan": "ABCDE1234F"}, headers=_headers())
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["data_source"] == "pan"
    assert body["signed_by"] == "Synthetic_Bureau"
    assert body["_cached"] is False
    assert body["_provider"] == "mock"


@pytest.mark.asyncio
async def test_pan_lookup_caches_second_call(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        first = (await c.post("/api/bureau/pan-lookup", json={"pan": "ABCDE1234F"}, headers=_headers())).json()
        second = (await c.post("/api/bureau/pan-lookup", json={"pan": "ABCDE1234F"}, headers=_headers())).json()
    assert first["_cached"] is False
    assert second["_cached"] is True
    # The feature payload itself must be identical
    for k in ("monthly_income", "credit_history_months", "data_source"):
        assert first[k] == second[k]


@pytest.mark.asyncio
async def test_pan_lookup_rejects_invalid_format(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        res = await c.post("/api/bureau/pan-lookup", json={"pan": "not-a-pan"}, headers=_headers())
    assert res.status_code == 400
