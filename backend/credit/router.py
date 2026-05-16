import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from redis.asyncio import Redis

from core.deps import get_current_user, rate_limit_score
from core.redis import get_redis
from credit.schemas import ScoreRequest, ScoreResponse
from credit.scoring import compute_score

router = APIRouter()


def _assert_owner(report: dict, user_id: str) -> None:
    """Raise 403 if the report doesn't belong to this user."""
    if report.get("user_id") != user_id:
        raise HTTPException(403, "Access denied")


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
        # Encrypted input blob — the server stores this opaque ciphertext but cannot decrypt it.
        # Decryption requires the device key stored only in the user's browser localStorage.
        "encrypted_inputs": body.encrypted_inputs,
        "data_source": body.data_source,
        "generated_at": now,
        "cached": False,
        "loan_applied": False,
        "loan_tx_hash": None,
    }

    raw = json.dumps(payload)
    await redis.setex(cache_key, 604800, raw)
    await redis.lpush(f"report:history:{user['id']}", report_id)
    await redis.set(f"report:data:{report_id}", raw)

    return payload


@router.get("/reports")
async def list_reports(user=Depends(get_current_user), redis: Redis = Depends(get_redis)):
    ids = await redis.lrange(f"report:history:{user['id']}", 0, 49)
    reports = []
    for rid in ids:
        raw = await redis.get(f"report:data:{rid}")
        if raw:
            reports.append(json.loads(raw))
    return reports


@router.get("/reports/{report_id}")
async def get_report(report_id: str, user=Depends(get_current_user), redis: Redis = Depends(get_redis)):
    raw = await redis.get(f"report:data:{report_id}")
    if not raw:
        raise HTTPException(404, "Report not found")
    report = json.loads(raw)
    _assert_owner(report, user["id"])
    return report


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

    report = json.loads(raw)
    _assert_owner(report, user["id"])

    report["loan_applied"] = True
    report["loan_tx_hash"] = body.get("tx_hash")
    await redis.set(f"report:data:{report_id}", json.dumps(report))
    return {"ok": True}
