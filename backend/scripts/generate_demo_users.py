"""
Seed Redis with 6 demo user accounts for judge demonstrations.
Run: uv run python scripts/generate_demo_users.py

Each account maps to a specific judge scenario — see ARCHITECTURE.md §12.
"""

import asyncio
import json
import sys
import uuid
from datetime import datetime, timezone

import redis.asyncio as aioredis

sys.path.insert(0, ".")
from auth.utils import hash_password
from credit.scoring import compute_score

DEMO_USERS = [
    ("alice@zkcredit.demo",   "demo1234", 95000,  0.18, 0.97, 60),   # Prime
    ("bob@zkcredit.demo",     "demo1234", 62000,  0.35, 0.78, 28),   # Silver
    ("carol@zkcredit.demo",   "demo1234", 41000,  0.52, 0.61, 14),   # Bronze
    ("dave@zkcredit.demo",    "demo1234", 28000,  0.71, 0.40,  6),   # None
    ("eva@zkcredit.demo",     "demo1234", 78000,  0.24, 0.88, 42),   # Gold
    ("frank@zkcredit.demo",   "demo1234", 110000, 0.05, 0.99, 84),   # Fraudster (Prime but will request over-limit)
]


async def seed():
    r = aioredis.Redis.from_url("redis://localhost:6379/0", decode_responses=True)

    for email, password, income, debt_ratio, payment_score, emp_months in DEMO_USERS:
        existing = await r.get(f"user:email:{email}")
        if existing:
            print(f"  skip {email} (already exists)")
            continue

        user_id = str(uuid.uuid4())
        await r.hset(f"user:{user_id}", mapping={
            "email": email,
            "password_hash": hash_password(password),
            "wallet_address": "",
        })
        await r.set(f"user:email:{email}", user_id)

        result = compute_score(income, debt_ratio, payment_score, emp_months)
        report_id = f"rpt_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()

        payload = json.dumps({
            "report_id": report_id,
            "score": result.score,
            "tier": result.tier,
            "tier_label": result.tier_label,
            "loan_limit": result.loan_limit,
            "interest_rate": result.interest_rate,
            "term_months": result.term_months,
            "breakdown": {
                "income_pts": result.income_pts,
                "debt_pts": result.debt_pts,
                "payment_pts": result.payment_pts,
                "employment_pts": result.employment_pts,
            },
            "generated_at": now,
            "cached": False,
            "loan_applied": False,
            "loan_tx_hash": None,
        })

        await r.setex(f"report:latest:{user_id}", 604800, payload)
        await r.lpush(f"report:history:{user_id}", report_id)
        await r.set(f"report:data:{report_id}", payload)

        print(f"  created {email} → score {result.score} ({result.tier_label})")

    await r.aclose()
    print("\nDone. Login with any demo account using password: demo1234")


asyncio.run(seed())
