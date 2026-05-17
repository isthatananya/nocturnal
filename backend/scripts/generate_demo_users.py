"""
Seed Redis with 6 demo user accounts for judge demonstrations.
Run: uv run python scripts/generate_demo_users.py

Personas:
  priya@nocturned.demo  → Prime   (score ~100, ideal applicant)
  rahul@nocturned.demo  → Gold    (score ~76)
  anita@nocturned.demo  → Silver  (score ~59)
  suresh@nocturned.demo → Bronze  (score ~35)
  meena@nocturned.demo  → None    (score ~0, high-risk)
  vikram@nocturned.demo → Prime   (high earner — shows over-limit rejection)
"""

import asyncio
import json
import sys
import uuid
from datetime import date, datetime, timezone

import redis.asyncio as aioredis

sys.path.insert(0, ".")
from auth.utils import hash_password
from credit.scoring import compute_score
from core.config import settings

# (email, password, full_name, dob, profession, *scoring_fields)
# Scoring fields match compute_score signature exactly:
#   monthly_income, monthly_emi_obligations,
#   dpd_max_12m, missed_emi_12m, has_settled_account,
#   credit_history_months, hard_inquiries_6m,
#   credit_card_utilization, active_loan_accounts, secured_loans_count,
#   employment_type, employment_months,
#   bank_bounce_count_12m, itr_filed, existing_cibil_score

DEMO_USERS = [
    {
        "email": "priya@nocturned.demo",
        "password": "demo1234",
        "full_name": "Priya Sharma",
        "date_of_birth": "1995-03-12",
        "profession": "Salaried Employee",
        "score_inputs": dict(
            monthly_income=95000, monthly_emi_obligations=15000,
            dpd_max_12m=0, missed_emi_12m=0, has_settled_account=False,
            credit_history_months=84, hard_inquiries_6m=0,
            credit_card_utilization=0.15, active_loan_accounts=2, secured_loans_count=1,
            employment_type="salaried", employment_months=48,
            bank_bounce_count_12m=0, itr_filed=True, existing_cibil_score=780,
        ),
    },
    {
        "email": "rahul@nocturned.demo",
        "password": "demo1234",
        "full_name": "Rahul Gupta",
        "date_of_birth": "1992-07-24",
        "profession": "Salaried Employee",
        "score_inputs": dict(
            monthly_income=62000, monthly_emi_obligations=22000,
            dpd_max_12m=15, missed_emi_12m=1, has_settled_account=False,
            credit_history_months=60, hard_inquiries_6m=1,
            credit_card_utilization=0.28, active_loan_accounts=2, secured_loans_count=1,
            employment_type="salaried", employment_months=30,
            bank_bounce_count_12m=0, itr_filed=True, existing_cibil_score=720,
        ),
    },
    {
        "email": "anita@nocturned.demo",
        "password": "demo1234",
        "full_name": "Anita Desai",
        "date_of_birth": "1989-11-05",
        "profession": "Self-employed / Freelancer",
        "score_inputs": dict(
            monthly_income=45000, monthly_emi_obligations=18000,
            dpd_max_12m=25, missed_emi_12m=1, has_settled_account=False,
            credit_history_months=36, hard_inquiries_6m=2,
            credit_card_utilization=0.40, active_loan_accounts=3, secured_loans_count=1,
            employment_type="self_employed", employment_months=36,
            bank_bounce_count_12m=1, itr_filed=True, existing_cibil_score=680,
        ),
    },
    {
        "email": "suresh@nocturned.demo",
        "password": "demo1234",
        "full_name": "Suresh Kumar",
        "date_of_birth": "1986-02-18",
        "profession": "Salaried Employee",
        "score_inputs": dict(
            monthly_income=28000, monthly_emi_obligations=14000,
            dpd_max_12m=40, missed_emi_12m=1, has_settled_account=False,
            credit_history_months=24, hard_inquiries_6m=3,
            credit_card_utilization=0.55, active_loan_accounts=2, secured_loans_count=0,
            employment_type="salaried", employment_months=12,
            bank_bounce_count_12m=2, itr_filed=False, existing_cibil_score=None,
        ),
    },
    {
        "email": "meena@nocturned.demo",
        "password": "demo1234",
        "full_name": "Meena Pillai",
        "date_of_birth": "1998-09-30",
        "profession": "Homemaker",
        "score_inputs": dict(
            monthly_income=18000, monthly_emi_obligations=12000,
            dpd_max_12m=80, missed_emi_12m=4, has_settled_account=False,
            credit_history_months=12, hard_inquiries_6m=4,
            credit_card_utilization=0.80, active_loan_accounts=4, secured_loans_count=0,
            employment_type="unemployed", employment_months=0,
            bank_bounce_count_12m=3, itr_filed=False, existing_cibil_score=None,
        ),
    },
    {
        "email": "vikram@nocturned.demo",
        "password": "demo1234",
        "full_name": "Vikram Singh",
        "date_of_birth": "1983-06-14",
        "profession": "Business Owner",
        "score_inputs": dict(
            monthly_income=110000, monthly_emi_obligations=8000,
            dpd_max_12m=0, missed_emi_12m=0, has_settled_account=False,
            credit_history_months=96, hard_inquiries_6m=0,
            credit_card_utilization=0.10, active_loan_accounts=2, secured_loans_count=1,
            employment_type="business_owner", employment_months=60,
            bank_bounce_count_12m=0, itr_filed=True, existing_cibil_score=800,
        ),
    },
]


async def seed():
    r = aioredis.Redis.from_url(settings.redis_url, decode_responses=True)

    for user in DEMO_USERS:
        email = user["email"]
        existing = await r.get(f"user:email:{email}")
        if existing:
            print(f"  skip {email} (already exists)")
            continue

        user_id = str(uuid.uuid4())
        await r.hset(f"user:{user_id}", mapping={
            "email": email,
            "password_hash": hash_password(user["password"]),
            "full_name": user["full_name"],
            "date_of_birth": user["date_of_birth"],
            "profession": user["profession"],
            "wallet_address": "",
            "email_verified": "0",
            "role": "borrower",
        })
        await r.set(f"user:email:{email}", user_id)

        result = compute_score(**user["score_inputs"])
        report_id = f"rpt_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()

        payload = json.dumps({
            "report_id": report_id,
            "user_id": user_id,
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
            "data_source": "form",
            "generated_at": now,
            "cached": False,
            "loan_applied": False,
            "loan_tx_hash": None,
        })

        await r.setex(f"report:latest:{user_id}", 604800, payload)
        await r.lpush(f"report:history:{user_id}", report_id)
        await r.set(f"report:data:{report_id}", payload)

        print(f"  created {email} ({user['full_name']}) → score {result.score} ({result.tier_label})")

    await r.aclose()
    print("\nDone. Login with password: demo1234")


asyncio.run(seed())
