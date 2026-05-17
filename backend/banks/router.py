import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from redis.asyncio import Redis

from banks.schemas import ApprovalDecision, Bank, LoanRequest, LoanRequestCreate
from banks.service import SEEDED_BANKS, compute_approval_probability, get_bank
from core.deps import get_current_user
from core.redis import get_redis

router = APIRouter()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _require_bank(user: dict) -> dict:
    if user.get("role") != "bank":
        raise HTTPException(403, "Bank role required")
    return user


# ── Banks ──────────────────────────────────────────────────────────────────

@router.get("/banks", response_model=list[Bank])
async def list_banks(
    score: int | None = None,
    tier: int | None = None,
    user: dict = Depends(get_current_user),
):
    result = []
    for b in SEEDED_BANKS:
        prob = compute_approval_probability(score, tier, b) if score is not None and tier is not None else None
        result.append(Bank(**b, features=b["features"], approval_probability=prob))
    return result


@router.get("/banks/{bank_id}", response_model=Bank)
async def get_bank_detail(
    bank_id: str,
    user: dict = Depends(get_current_user),
):
    b = get_bank(bank_id)
    if not b:
        raise HTTPException(404, "Bank not found")
    return Bank(**b, features=b["features"])


# ── Loan Requests ──────────────────────────────────────────────────────────

@router.post("/loan-requests", response_model=LoanRequest, status_code=201)
async def submit_loan_request(
    body: LoanRequestCreate,
    user: dict = Depends(get_current_user),
    redis: Redis = Depends(get_redis),
):
    bank = get_bank(body.bank_id)
    if not bank:
        raise HTTPException(404, "Bank not found")

    tier = body.tier
    tier_label = body.tier_label
    score = body.score

    prob = compute_approval_probability(score, tier, bank)
    if prob == 0:
        raise HTTPException(400, f"Your credit tier ({tier_label}) does not meet {bank['name']}'s minimum requirements")

    if body.amount > bank["max_loan"]:
        raise HTTPException(400, f"Requested amount exceeds {bank['name']}'s maximum loan of ₹{bank['max_loan']:,}")

    request_id = str(uuid.uuid4())
    now = _now()

    await redis.hset(f"loan_request:{request_id}", mapping={
        "request_id": request_id,
        "user_id": user["id"],
        "bank_id": body.bank_id,
        "bank_name": bank["name"],
        "report_id": body.report_id,
        "amount": str(body.amount),
        "tier": str(tier),
        "tier_label": tier_label,
        "status": "pending",
        "created_at": now,
        "updated_at": now,
        "message": "",
        "tx_hash": "",
    })
    await redis.lpush(f"loan_requests:user:{user['id']}", request_id)
    await redis.lpush(f"loan_requests:bank:{body.bank_id}", request_id)

    return LoanRequest(
        request_id=request_id,
        user_id=user["id"],
        bank_id=body.bank_id,
        bank_name=bank["name"],
        report_id=body.report_id,
        amount=body.amount,
        tier=tier,
        tier_label=tier_label,
        status="pending",
        created_at=now,
        updated_at=now,
        message=None,
        tx_hash=None,
    )


async def _load_request(request_id: str, redis: Redis) -> dict:
    raw = await redis.hgetall(f"loan_request:{request_id}")
    if not raw:
        raise HTTPException(404, "Loan request not found")
    return raw


def _raw_to_loan_request(raw: dict, borrower_name: str | None = None) -> LoanRequest:
    return LoanRequest(
        request_id=raw["request_id"],
        user_id=raw["user_id"],
        bank_id=raw["bank_id"],
        bank_name=raw["bank_name"],
        report_id=raw["report_id"],
        amount=int(raw["amount"]),
        tier=int(raw["tier"]),
        tier_label=raw["tier_label"],
        status=raw["status"],
        created_at=raw["created_at"],
        updated_at=raw["updated_at"],
        message=raw.get("message") or None,
        tx_hash=raw.get("tx_hash") or None,
        borrower_name=borrower_name,
    )


@router.get("/loan-requests/mine", response_model=list[LoanRequest])
async def my_requests(
    user: dict = Depends(get_current_user),
    redis: Redis = Depends(get_redis),
):
    ids = await redis.lrange(f"loan_requests:user:{user['id']}", 0, -1)
    result = []
    for rid in ids:
        raw = await redis.hgetall(f"loan_request:{rid}")
        if raw:
            result.append(_raw_to_loan_request(raw))
    return result


@router.get("/loan-requests/incoming", response_model=list[LoanRequest])
async def incoming_requests(
    bank_id: str | None = None,
    user: dict = Depends(get_current_user),
    redis: Redis = Depends(get_redis),
):
    _require_bank(user)

    if bank_id:
        ids = await redis.lrange(f"loan_requests:bank:{bank_id}", 0, -1)
    else:
        # Return all requests across all banks
        all_ids: list[str] = []
        for b in SEEDED_BANKS:
            ids = await redis.lrange(f"loan_requests:bank:{b['bank_id']}", 0, -1)
            all_ids.extend(ids)
        ids = all_ids

    result = []
    for rid in ids:
        raw = await redis.hgetall(f"loan_request:{rid}")
        if not raw:
            continue
        borrower = await redis.hgetall(f"user:{raw['user_id']}")
        borrower_name = borrower.get("full_name") or borrower.get("email") or "Unknown"
        result.append(_raw_to_loan_request(raw, borrower_name=borrower_name))
    return result


@router.patch("/loan-requests/{request_id}", response_model=LoanRequest)
async def decide_request(
    request_id: str,
    body: ApprovalDecision,
    user: dict = Depends(get_current_user),
    redis: Redis = Depends(get_redis),
):
    _require_bank(user)
    raw = await _load_request(request_id, redis)

    now = _now()
    await redis.hset(f"loan_request:{request_id}", mapping={
        "status": body.status,
        "updated_at": now,
        "message": body.message or "",
        "tx_hash": body.tx_hash or "",
    })
    raw.update({
        "status": body.status,
        "updated_at": now,
        "message": body.message or "",
        "tx_hash": body.tx_hash or "",
    })
    return _raw_to_loan_request(raw)
