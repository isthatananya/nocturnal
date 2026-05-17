import asyncio
import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from redis.asyncio import Redis

from auth.utils import decode_token
from banks.schemas import ApprovalDecision, Bank, CounterResponse, LoanRequest, LoanRequestCreate
from banks.service import SEEDED_BANKS, compute_approval_probability, compute_risk, get_bank
from core.deps import get_current_user, rate_limit_loan_apply
from core.redis import get_redis

router = APIRouter()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _require_bank(user: dict) -> dict:
    if user.get("role") != "bank":
        raise HTTPException(403, "Bank role required")
    return user


def _maybe_int(v: str | None) -> int | None:
    if v is None or v == "":
        return None
    try:
        return int(v)
    except ValueError:
        return None


def _maybe_float(v: str | None) -> float | None:
    if v is None or v == "":
        return None
    try:
        return float(v)
    except ValueError:
        return None


def _raw_to_loan_request(raw: dict, borrower_name: str | None = None) -> LoanRequest:
    bank = get_bank(raw["bank_id"]) or {}
    tier = int(raw["tier"])
    amount = int(raw["amount"])
    score_val = int(raw.get("score", 0))
    prob = compute_approval_probability(score_val, tier, bank) if bank else None
    risk_score, risk_label = compute_risk(tier, amount, bank) if bank else (None, None)
    return LoanRequest(
        request_id=raw["request_id"],
        user_id=raw["user_id"],
        bank_id=raw["bank_id"],
        bank_name=raw["bank_name"],
        report_id=raw["report_id"],
        amount=amount,
        tier=tier,
        tier_label=raw["tier_label"],
        score=score_val,
        status=raw["status"],
        created_at=raw["created_at"],
        updated_at=raw["updated_at"],
        message=raw.get("message") or None,
        tx_hash=raw.get("tx_hash") or None,
        borrower_name=borrower_name,
        approval_probability=prob,
        risk_score=risk_score,
        risk_label=risk_label,
        counter_amount=_maybe_int(raw.get("counter_amount")),
        counter_rate=_maybe_float(raw.get("counter_rate")),
        counter_term_months=_maybe_int(raw.get("counter_term_months")),
    )


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
        result.append(Bank(**b, approval_probability=prob))
    # Sort by approval probability descending (None last)
    result.sort(key=lambda b: b.approval_probability if b.approval_probability is not None else -1, reverse=True)
    return result


@router.get("/banks/{bank_id}", response_model=Bank)
async def get_bank_detail(bank_id: str, user: dict = Depends(get_current_user)):
    b = get_bank(bank_id)
    if not b:
        raise HTTPException(404, "Bank not found")
    return Bank(**b)


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

    # 3 applications per 24h per (borrower, bank) pair — prevents spamming
    # any single lender.
    await rate_limit_loan_apply(body.bank_id, user, redis)

    tier = body.tier
    tier_label = body.tier_label
    score = body.score

    if body.amount > bank["max_loan"]:
        raise HTTPException(400, f"Requested amount exceeds {bank['name']}'s maximum loan of ₹{bank['max_loan']:,}")

    # Allow 0% probability applications — just flag them
    prob = compute_approval_probability(score, tier, bank)
    risk_score, risk_label = compute_risk(tier, body.amount, bank)

    request_id = str(uuid.uuid4())
    now = _now()

    mapping = {
        "request_id": request_id,
        "user_id": user["id"],
        "bank_id": body.bank_id,
        "bank_name": bank["name"],
        "report_id": body.report_id,
        "amount": str(body.amount),
        "tier": str(tier),
        "tier_label": tier_label,
        "score": str(score),
        "status": "pending",
        "created_at": now,
        "updated_at": now,
        "message": "",
        "tx_hash": "",
    }
    await redis.hset(f"loan_request:{request_id}", mapping=mapping)
    await redis.lpush(f"loan_requests:user:{user['id']}", request_id)
    await redis.lpush(f"loan_requests:bank:{body.bank_id}", request_id)

    # Publish real-time notification to bank dashboard subscribers
    notification = json.dumps({
        "type": "new_request",
        "request_id": request_id,
        "bank_id": body.bank_id,
        "bank_name": bank["name"],
        "amount": body.amount,
        "tier_label": tier_label,
        "risk_label": risk_label,
        "approval_probability": prob,
        "created_at": now,
    })
    await redis.publish("bank:new_request", notification)

    return LoanRequest(
        request_id=request_id,
        user_id=user["id"],
        bank_id=body.bank_id,
        bank_name=bank["name"],
        report_id=body.report_id,
        amount=body.amount,
        tier=tier,
        tier_label=tier_label,
        score=score,
        status="pending",
        created_at=now,
        updated_at=now,
        message=None,
        tx_hash=None,
        approval_probability=prob,
        risk_score=risk_score,
        risk_label=risk_label,
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

    # If the user has a bank_id in their profile, use that as default filter
    user_bank_id = user.get("bank_id") or bank_id

    if user_bank_id:
        ids = await redis.lrange(f"loan_requests:bank:{user_bank_id}", 0, -1)
    else:
        all_ids: list[str] = []
        for b in SEEDED_BANKS:
            ids = await redis.lrange(f"loan_requests:bank:{b['bank_id']}", 0, -1)
            all_ids.extend(ids)
        ids = all_ids

    result = []
    seen = set()
    for rid in ids:
        if rid in seen:
            continue
        seen.add(rid)
        raw = await redis.hgetall(f"loan_request:{rid}")
        if not raw:
            continue
        borrower = await redis.hgetall(f"user:{raw['user_id']}")
        borrower_name = borrower.get("full_name") or borrower.get("email") or "Unknown"
        result.append(_raw_to_loan_request(raw, borrower_name=borrower_name))
    # Newest first
    result.sort(key=lambda r: r.created_at, reverse=True)
    return result


@router.get("/loan-requests/pending-count")
async def pending_count(
    user: dict = Depends(get_current_user),
    redis: Redis = Depends(get_redis),
):
    _require_bank(user)
    user_bank_id = user.get("bank_id")
    ids: list[str] = []
    if user_bank_id:
        ids = await redis.lrange(f"loan_requests:bank:{user_bank_id}", 0, -1)
    else:
        for b in SEEDED_BANKS:
            chunk = await redis.lrange(f"loan_requests:bank:{b['bank_id']}", 0, -1)
            ids.extend(chunk)
    count = 0
    seen = set()
    for rid in ids:
        if rid in seen:
            continue
        seen.add(rid)
        status = await redis.hget(f"loan_request:{rid}", "status")
        if status == "pending":
            count += 1
    return {"pending": count}


@router.patch("/loan-requests/{request_id}", response_model=LoanRequest)
async def decide_request(
    request_id: str,
    body: ApprovalDecision,
    user: dict = Depends(get_current_user),
    redis: Redis = Depends(get_redis),
):
    _require_bank(user)
    raw = await redis.hgetall(f"loan_request:{request_id}")
    if not raw:
        raise HTTPException(404, "Loan request not found")

    # Counter requires at least one revised term, otherwise it's indistinguishable
    # from a plain approval and the borrower has nothing to accept/decline.
    if body.status == "countered" and not any([body.counter_amount, body.counter_rate, body.counter_term_months]):
        raise HTTPException(400, "Counter-offer requires at least one of counter_amount, counter_rate, counter_term_months")

    # Block re-decisions once the request has reached a terminal state.
    if raw.get("status") in ("approved", "rejected"):
        raise HTTPException(409, f"Request already {raw['status']}; cannot be modified")

    now = _now()
    mapping = {
        "status": body.status,
        "updated_at": now,
        "message": body.message or "",
        "tx_hash": body.tx_hash or "",
    }
    if body.status == "countered":
        mapping["counter_amount"] = str(body.counter_amount) if body.counter_amount is not None else ""
        mapping["counter_rate"] = str(body.counter_rate) if body.counter_rate is not None else ""
        mapping["counter_term_months"] = str(body.counter_term_months) if body.counter_term_months is not None else ""
    await redis.hset(f"loan_request:{request_id}", mapping=mapping)
    raw.update(mapping)

    # Notify the borrower
    notification = json.dumps({
        "type": "decision",
        "request_id": request_id,
        "bank_id": raw.get("bank_id"),
        "bank_name": raw.get("bank_name"),
        "status": body.status,
        "message": body.message or "",
        "counter_amount": body.counter_amount,
        "counter_rate": body.counter_rate,
        "counter_term_months": body.counter_term_months,
    })
    await redis.publish(f"borrower:decision:{raw.get('user_id')}", notification)

    return _raw_to_loan_request(raw)


@router.post("/loan-requests/{request_id}/counter-response", response_model=LoanRequest)
async def respond_to_counter(
    request_id: str,
    body: CounterResponse,
    user: dict = Depends(get_current_user),
    redis: Redis = Depends(get_redis),
):
    """Borrower accepts or declines a bank's counter-offer.

    Accept → status becomes `approved`, with counter terms applied as the
    final amount/rate/term. Decline → status becomes `rejected`. Either way
    the request reaches a terminal state.
    """
    raw = await redis.hgetall(f"loan_request:{request_id}")
    if not raw:
        raise HTTPException(404, "Loan request not found")
    if raw.get("user_id") != user["id"]:
        raise HTTPException(403, "Not your loan request")
    if raw.get("status") != "countered":
        raise HTTPException(400, f"Request is {raw.get('status')!r}, not countered")

    now = _now()
    if body.decision == "accepted":
        # The counter terms become the final terms. Update `amount` so the
        # downstream views show the agreed figure rather than the original.
        new_amount = _maybe_int(raw.get("counter_amount")) or int(raw["amount"])
        mapping = {
            "status": "approved",
            "updated_at": now,
            "amount": str(new_amount),
        }
    else:
        mapping = {
            "status": "rejected",
            "updated_at": now,
        }
    await redis.hset(f"loan_request:{request_id}", mapping=mapping)
    raw.update(mapping)

    # Notify the bank side
    notification = json.dumps({
        "type": "counter_response",
        "request_id": request_id,
        "bank_id": raw.get("bank_id"),
        "decision": body.decision,
        "final_status": mapping["status"],
    })
    await redis.publish("bank:new_request", notification)

    return _raw_to_loan_request(raw)


# ── WebSocket — real-time bank feed ────────────────────────────────────────

@router.websocket("/ws/bank-feed")
async def bank_feed(websocket: WebSocket, redis: Redis = Depends(get_redis)):
    # Authenticate from session cookie in the WebSocket upgrade request
    cookie_header = websocket.headers.get("cookie", "")
    cookies: dict[str, str] = {}
    for part in cookie_header.split(";"):
        part = part.strip()
        if "=" in part:
            k, v = part.split("=", 1)
            cookies[k.strip()] = v.strip()

    session = cookies.get("session")
    if not session:
        await websocket.close(code=1008, reason="no session")
        return

    payload = decode_token(session)
    if not payload:
        await websocket.close(code=1008, reason="invalid token")
        return

    user_id = payload["sub"]
    jti = payload.get("jti")
    stored_jti = await redis.get(f"session:jti:{user_id}")
    if not stored_jti or stored_jti != jti:
        await websocket.close(code=1008, reason="session expired")
        return

    user_data = await redis.hgetall(f"user:{user_id}")
    if not user_data or user_data.get("role") != "bank":
        await websocket.close(code=1008, reason="bank role required")
        return

    await websocket.accept()

    pubsub = redis.pubsub()
    await pubsub.subscribe("bank:new_request")

    async def forward():
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    await websocket.send_text(message["data"])
        except Exception:
            pass

    forwarder = asyncio.create_task(forward())
    try:
        # Send heartbeat every 25s to keep the connection alive through proxies
        while True:
            await asyncio.sleep(25)
            await websocket.send_text(json.dumps({"type": "ping"}))
    except (WebSocketDisconnect, Exception):
        pass
    finally:
        forwarder.cancel()
        try:
            await pubsub.unsubscribe("bank:new_request")
        except Exception:
            pass


# ── WebSocket — borrower decision feed ─────────────────────────────────────

@router.websocket("/ws/borrower-feed")
async def borrower_feed(websocket: WebSocket, redis: Redis = Depends(get_redis)):
    cookie_header = websocket.headers.get("cookie", "")
    cookies: dict[str, str] = {}
    for part in cookie_header.split(";"):
        part = part.strip()
        if "=" in part:
            k, v = part.split("=", 1)
            cookies[k.strip()] = v.strip()

    session = cookies.get("session")
    if not session:
        await websocket.close(code=1008, reason="no session")
        return

    payload = decode_token(session)
    if not payload:
        await websocket.close(code=1008, reason="invalid token")
        return

    user_id = payload["sub"]
    jti = payload.get("jti")
    stored_jti = await redis.get(f"session:jti:{user_id}")
    if not stored_jti or stored_jti != jti:
        await websocket.close(code=1008, reason="session expired")
        return

    await websocket.accept()

    pubsub = redis.pubsub()
    await pubsub.subscribe(f"borrower:decision:{user_id}")

    async def forward():
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    await websocket.send_text(message["data"])
        except Exception:
            pass

    forwarder = asyncio.create_task(forward())
    try:
        while True:
            await asyncio.sleep(25)
            await websocket.send_text(json.dumps({"type": "ping"}))
    except (WebSocketDisconnect, Exception):
        pass
    finally:
        forwarder.cancel()
        try:
            await pubsub.unsubscribe(f"borrower:decision:{user_id}")
        except Exception:
            pass
