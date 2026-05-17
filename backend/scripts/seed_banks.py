"""
Seed Redis with bank officer accounts and sample loan request history.

Run inside the backend container:
  uv run python scripts/seed_banks.py

Depends on: generate_demo_users.py having been run first (creates borrower accounts).

Bank accounts seeded:
  officer@neonbank.demo      / NeonBank2026!
  loans@apexcredit.demo      / ApexCredit2026!
  defi@horizondefi.demo      / HorizonDeFi2026!
"""

import asyncio
import json
import sys
import uuid
from datetime import datetime, timedelta, timezone

import redis.asyncio as aioredis

sys.path.insert(0, ".")
from auth.utils import hash_password
from banks.service import compute_approval_probability, compute_risk, get_bank
from core.config import settings

BANK_OFFICERS = [
    {
        "email": "officer@neonbank.demo",
        "password": "NeonBank2026!",
        "full_name": "Neha Kapoor",
        "date_of_birth": "1987-04-22",
        "profession": "Loan Officer",
        "bank_id": "neon_bank",
    },
    {
        "email": "loans@apexcredit.demo",
        "password": "ApexCredit2026!",
        "full_name": "Arjun Mehta",
        "date_of_birth": "1984-09-11",
        "profession": "Credit Analyst",
        "bank_id": "apex_credit",
    },
    {
        "email": "defi@horizondefi.demo",
        "password": "HorizonDeFi2026!",
        "full_name": "Tara Iyer",
        "date_of_birth": "1991-01-30",
        "profession": "DeFi Operations",
        "bank_id": "horizon_defi",
    },
]

# Pre-computed from generate_demo_users.py scoring inputs
# (email, tier, tier_label, score, loan_limit)
BORROWER_PROFILES = {
    "priya@zkcredit.demo":  {"tier": 4, "tier_label": "Prime",  "score": 832, "loan_limit": 3_420_000},
    "rahul@zkcredit.demo":  {"tier": 3, "tier_label": "Gold",   "score": 718, "loan_limit": 1_736_000},
    "anita@zkcredit.demo":  {"tier": 2, "tier_label": "Silver", "score": 643, "loan_limit":   900_000},
    "suresh@zkcredit.demo": {"tier": 1, "tier_label": "Bronze", "score": 524, "loan_limit":   336_000},
    "meena@zkcredit.demo":  {"tier": 0, "tier_label": "None",   "score": 398, "loan_limit":         0},
}

# Sample seeded requests: (borrower_email, bank_id, amount, status, message, days_ago)
SAMPLE_REQUESTS = [
    # Priya (Prime) — approved by Neon, pending at Horizon
    ("priya@zkcredit.demo", "neon_bank",     4_000_000, "approved",
     "Excellent credit profile. Approved at Prime rates. Funds disbursed.", 5),
    ("priya@zkcredit.demo", "horizon_defi",  1_500_000, "pending", "", 1),

    # Rahul (Gold) — approved by Apex, pending at Neon
    ("rahul@zkcredit.demo", "neon_bank",     1_200_000, "pending", "", 2),
    ("rahul@zkcredit.demo", "apex_credit",     800_000, "approved",
     "Strong Gold-tier profile. Approved at standard rates.", 7),

    # Anita (Silver) — rejected by Horizon, pending at Apex
    ("anita@zkcredit.demo", "horizon_defi",  1_000_000, "rejected",
     "FOIR concerns — current EMI obligations exceed Silver threshold for this amount. Consider a smaller request.", 4),
    ("anita@zkcredit.demo", "apex_credit",     500_000, "pending", "", 1),

    # Suresh (Bronze) — pending at Apex
    ("suresh@zkcredit.demo", "apex_credit",    200_000, "pending", "", 3),

    # Meena (None) — rejected everywhere she applied
    ("meena@zkcredit.demo", "apex_credit",     100_000, "rejected",
     "Score below minimum eligibility threshold. Please improve credit profile and reapply.", 6),
]


def _ts(days_ago: int = 0) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days_ago)).isoformat()


async def seed():
    r = aioredis.Redis.from_url(settings.redis_url, decode_responses=True)

    print("── Creating bank officer accounts ──────────────────────")
    for officer in BANK_OFFICERS:
        email = officer["email"]
        existing = await r.get(f"user:email:{email}")
        if existing:
            print(f"  skip {email} (already exists)")
            continue

        user_id = str(uuid.uuid4())
        await r.hset(f"user:{user_id}", mapping={
            "email": email,
            "password_hash": hash_password(officer["password"]),
            "full_name": officer["full_name"],
            "date_of_birth": officer["date_of_birth"],
            "profession": officer["profession"],
            "role": "bank",
            "bank_id": officer["bank_id"],
            "wallet_address": "",
            "email_verified": "1",
        })
        await r.set(f"user:email:{email}", user_id)
        print(f"  created {email} ({officer['full_name']}) → {officer['bank_id']}")

    print("\n── Seeding sample loan requests ────────────────────────")
    for borrower_email, bank_id, amount, status, message, days_ago in SAMPLE_REQUESTS:
        # Look up borrower user_id
        borrower_id = await r.get(f"user:email:{borrower_email}")
        if not borrower_id:
            print(f"  skip {borrower_email} — borrower not found (run generate_demo_users.py first)")
            continue

        profile = BORROWER_PROFILES[borrower_email]
        bank = get_bank(bank_id)
        if not bank:
            print(f"  skip unknown bank {bank_id}")
            continue

        # Skip if a request with same user+bank already exists
        existing_ids = await r.lrange(f"loan_requests:user:{borrower_id}", 0, -1)
        duplicate = False
        for rid in existing_ids:
            existing_raw = await r.hget(f"loan_request:{rid}", "bank_id")
            if existing_raw == bank_id:
                print(f"  skip {borrower_email} → {bank_id} (already seeded)")
                duplicate = True
                break
        if duplicate:
            continue

        risk_score, risk_label = compute_risk(profile["tier"], amount, bank)
        request_id = str(uuid.uuid4())
        created = _ts(days_ago)
        updated = _ts(days_ago - 1 if status != "pending" else days_ago)

        await r.hset(f"loan_request:{request_id}", mapping={
            "request_id": request_id,
            "user_id": borrower_id,
            "bank_id": bank_id,
            "bank_name": bank["name"],
            "report_id": f"rpt_seed_{uuid.uuid4().hex[:8]}",
            "amount": str(amount),
            "tier": str(profile["tier"]),
            "tier_label": profile["tier_label"],
            "score": str(profile["score"]),
            "status": status,
            "created_at": created,
            "updated_at": updated,
            "message": message,
            "tx_hash": f"mid1{uuid.uuid4().hex[:16]}" if status == "approved" else "",
        })
        await r.lpush(f"loan_requests:user:{borrower_id}", request_id)
        await r.lpush(f"loan_requests:bank:{bank_id}", request_id)

        print(f"  {borrower_email} ({profile['tier_label']}) → {bank['name']} "
              f"₹{amount:,} [{status}] risk={risk_label}")

    await r.aclose()
    print("\n✓ Bank seed complete.")
    print("\nBank officer logins:")
    for o in BANK_OFFICERS:
        print(f"  {o['email']:35s}  {o['password']}")


asyncio.run(seed())
