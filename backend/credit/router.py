import json
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from redis.asyncio import Redis

from core.config import settings
from core.crypto import (
    CryptoError,
    ciphertext_fingerprint,
    decrypt_payload,
    encrypt_payload,
)
from core.deps import get_current_user, rate_limit_score
from core.redis import get_redis
from credit.amortisation import generate_schedule, parse_issued_date, schedule_to_dict
from credit.bureau import get_bureau_client, pan_cache_key, validate_pan
from credit.schemas import ScoreRequest, ScoreResponse
from credit.scoring import compute_score

router = APIRouter()
logger = logging.getLogger(__name__)


_OUTER_FIELDS = frozenset({
    "report_id",
    "user_id",
    "generated_at",
    "data_source",
    "encrypted_at_rest",
    "encrypted_at_rest_fp",
    "ciphertext",
})


def _assert_owner(report: dict, user_id: str) -> None:
    """Raise 403 if the report doesn't belong to this user."""
    if report.get("user_id") != user_id:
        raise HTTPException(403, "Access denied")


def _seal(payload: dict, user_id: str) -> dict:
    """Wrap a plaintext report into the at-rest envelope."""
    outer = {k: payload[k] for k in ("report_id", "user_id", "generated_at", "data_source") if k in payload}
    inner = {k: v for k, v in payload.items() if k not in outer}
    blob = encrypt_payload(json.dumps(inner).encode("utf-8"), user_id)
    return {
        **outer,
        "encrypted_at_rest": True,
        "encrypted_at_rest_fp": ciphertext_fingerprint(blob),
        "ciphertext": blob,
    }


def _open(record: dict, user_id: str) -> dict:
    """Decrypt an envelope; pass through legacy plaintext records."""
    if not record.get("encrypted_at_rest"):
        return record
    blob = record.get("ciphertext")
    if not blob:
        logger.warning("encrypted_at_rest=True but no ciphertext for %s", record.get("report_id"))
        return record
    try:
        inner = json.loads(decrypt_payload(blob, user_id))
    except CryptoError:
        logger.exception("decryption failed for report %s", record.get("report_id"))
        raise HTTPException(500, "Report unreadable — server key may have rotated")
    return {
        **inner,
        "report_id": record["report_id"],
        "user_id": record["user_id"],
        "generated_at": record.get("generated_at"),
        "data_source": record.get("data_source") or inner.get("data_source"),
        "encrypted_at_rest": True,
        "encrypted_at_rest_fp": record.get("encrypted_at_rest_fp"),
    }


@router.post("/score", response_model=ScoreResponse)
async def score_user(
    body: ScoreRequest,
    user=Depends(rate_limit_score),
    redis: Redis = Depends(get_redis),
):
    cache_key = f"report:latest:{user['id']}"

    # Always recompute — each POST is a fresh submission with (potentially) new data.
    # The cache is written below so the dashboard GET can read it quickly.
    result = compute_score(
        monthly_income=body.monthly_income,
        monthly_emi_obligations=body.monthly_emi_obligations,
        dpd_max_12m=body.dpd_max_12m,
        missed_emi_12m=body.missed_emi_12m,
        has_settled_account=body.has_settled_account,
        credit_history_months=body.credit_history_months,
        hard_inquiries_6m=body.hard_inquiries_6m,
        credit_card_utilization=body.credit_card_utilization,
        active_loan_accounts=body.active_loan_accounts,
        secured_loans_count=body.secured_loans_count,
        employment_type=body.employment_type,
        employment_months=body.employment_months,
        bank_bounce_count_12m=body.bank_bounce_count_12m,
        itr_filed=body.itr_filed,
        existing_cibil_score=body.existing_cibil_score,
    )

    report_id = f"rpt_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()

    payload = {
        "report_id": report_id,
        "user_id": user["id"],
        "score": result.score,
        "tier": result.tier,
        "tier_label": result.tier_label,
        "loan_limit": result.loan_limit,
        "interest_rate": result.interest_rate,
        "term_months": result.term_months,
        "breakdown": {
            "payment_pts": result.payment_pts,
            "foir_pts": result.foir_pts,
            "history_pts": result.history_pts,
            "credit_mix_pts": result.credit_mix_pts,
            "inquiry_pts": result.inquiry_pts,
            "adjustment": result.adjustment,
        },
        # Client-side opaque blob — server cannot decrypt this (device key lives in the browser).
        # Sits inside the server's at-rest envelope below for defense in depth.
        "encrypted_inputs": body.encrypted_inputs,
        "data_source": body.data_source,
        "generated_at": now,
        "cached": False,
        "loan_applied": False,
        "loan_tx_hash": None,
    }

    sealed = _seal(payload, user["id"])
    raw = json.dumps(sealed)
    await redis.setex(cache_key, 604800, raw)
    await redis.lpush(f"report:history:{user['id']}", report_id)
    await redis.set(f"report:data:{report_id}", raw)

    return {
        **payload,
        "encrypted_at_rest": True,
        "encrypted_at_rest_fp": sealed["encrypted_at_rest_fp"],
    }


@router.get("/reports")
async def list_reports(user=Depends(get_current_user), redis: Redis = Depends(get_redis)):
    ids = await redis.lrange(f"report:history:{user['id']}", 0, 49)
    reports = []
    for rid in ids:
        raw = await redis.get(f"report:data:{rid}")
        if raw:
            record = json.loads(raw)
            try:
                reports.append(_open(record, user["id"]))
            except HTTPException:
                # Skip records that fail to decrypt (key rotation, corruption) so the
                # history page still renders the rest.
                continue
    return reports


@router.get("/reports/{report_id}")
async def get_report(report_id: str, user=Depends(get_current_user), redis: Redis = Depends(get_redis)):
    raw = await redis.get(f"report:data:{report_id}")
    if not raw:
        raise HTTPException(404, "Report not found")
    record = json.loads(raw)
    _assert_owner(record, user["id"])
    return _open(record, user["id"])


@router.patch("/reports/{report_id}/loan")
async def mark_loan_applied(
    report_id: str,
    body: dict,
    user=Depends(get_current_user),
    redis: Redis = Depends(get_redis),
):
    raw = await redis.get(f"report:data:{report_id}")
    if not raw:
        raise HTTPException(404, "Report not found")

    record = json.loads(raw)
    _assert_owner(record, user["id"])
    report = _open(record, user["id"])

    report["loan_applied"] = True
    report["loan_tx_hash"] = body.get("tx_hash")
    # Seed disbursement metadata so the amortisation schedule has an anchor.
    report.setdefault("loan_issued_at", datetime.now(timezone.utc).isoformat())
    report.setdefault("paid_emi_count", 0)
    report.setdefault("loan_repaid", False)

    sealed = _seal(report, user["id"])
    await redis.set(f"report:data:{report_id}", json.dumps(sealed))
    return {"ok": True}


# ── Bureau lookup ────────────────────────────────────────────────────────────


_BUREAU_CACHE_TTL = 60 * 60 * 24 * 30   # 30 days


@router.post("/bureau/pan-lookup")
async def bureau_pan_lookup(
    body: dict,
    user=Depends(get_current_user),
    redis: Redis = Depends(get_redis),
):
    """Resolve a PAN to a `FeatureVector`-shaped record via the configured
    bureau client. Results are cached 30 days under a PAN-derived hash key
    so repeated lookups don't trigger a fresh bureau pull (a hard inquiry
    costs the user score points).

    Body: `{"pan": "ABCDE1234F"}`
    """
    pan = validate_pan(body.get("pan", "") if isinstance(body, dict) else "")
    cache_key = pan_cache_key(pan, settings.secret_key)

    cached = await redis.get(cache_key)
    if cached:
        return {**json.loads(cached), "_cached": True, "_provider": (await redis.get(cache_key + ":provider")) or "unknown"}

    client = get_bureau_client(settings)
    profile = await client.lookup(pan)

    await redis.setex(cache_key, _BUREAU_CACHE_TTL, json.dumps(profile))
    await redis.setex(cache_key + ":provider", _BUREAU_CACHE_TTL, client.provider_name)
    return {**profile, "_cached": False, "_provider": client.provider_name}


# ── Amortisation schedule + repayment ────────────────────────────────────────


@router.get("/reports/{report_id}/schedule")
async def get_loan_schedule(
    report_id: str,
    user=Depends(get_current_user),
    redis: Redis = Depends(get_redis),
):
    """Returns the amortisation schedule for an approved loan.

    The schedule is generated deterministically from amount/apr/term/issued_at
    so callers always see the same rows for the same loan — paid EMIs are
    tracked via `paid_emi_count` on the report.
    """
    raw = await redis.get(f"report:data:{report_id}")
    if not raw:
        raise HTTPException(404, "Report not found")
    record = json.loads(raw)
    _assert_owner(record, user["id"])
    report = _open(record, user["id"])

    if not report.get("loan_applied"):
        raise HTTPException(400, "No loan has been issued against this report yet")

    schedule = generate_schedule(
        principal=report.get("loan_limit") or 0,
        apr=report.get("interest_rate"),
        term_months=report.get("term_months"),
        start_date=parse_issued_date(report.get("loan_issued_at") or report.get("generated_at")),
        paid_count=int(report.get("paid_emi_count") or 0),
    )
    return {
        **schedule_to_dict(schedule),
        "report_id": report_id,
        "loan_tx_hash": report.get("loan_tx_hash"),
        "loan_repaid": bool(report.get("loan_repaid")),
    }


@router.post("/reports/{report_id}/repay")
async def repay_next_emi(
    report_id: str,
    body: dict | None = None,
    user=Depends(get_current_user),
    redis: Redis = Depends(get_redis),
):
    """Mark the next outstanding EMI as paid.

    Optional `tx_hash` in the body links the payment to a Midnight repayment
    transaction. When the final EMI is paid, `loan_repaid` flips to True.
    """
    raw = await redis.get(f"report:data:{report_id}")
    if not raw:
        raise HTTPException(404, "Report not found")
    record = json.loads(raw)
    _assert_owner(record, user["id"])
    report = _open(record, user["id"])

    if not report.get("loan_applied"):
        raise HTTPException(400, "No loan has been issued against this report yet")
    if report.get("loan_repaid"):
        raise HTTPException(409, "Loan already fully repaid")

    term = int(report.get("term_months") or 0)
    paid = int(report.get("paid_emi_count") or 0)
    if paid >= term:
        report["loan_repaid"] = True
    else:
        paid += 1
        report["paid_emi_count"] = paid
        if paid >= term:
            report["loan_repaid"] = True

    if body and isinstance(body, dict) and body.get("tx_hash"):
        # Track the most recent repayment tx — the wallet may produce a tx per EMI.
        report["last_repay_tx_hash"] = body.get("tx_hash")

    sealed = _seal(report, user["id"])
    await redis.set(f"report:data:{report_id}", json.dumps(sealed))
    return {
        "ok": True,
        "paid_emi_count": paid,
        "loan_repaid": bool(report.get("loan_repaid")),
    }
