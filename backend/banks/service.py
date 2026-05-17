SEEDED_BANKS: list[dict] = [
    {
        "bank_id": "neon_bank",
        "name": "Neon Bank",
        "tagline": "Premium lending for top-tier borrowers",
        "min_score": 690,
        "min_tier": 3,
        "max_loan": 5_000_000,
        "interest_rate": 12.5,
        "term_months": 60,
        "logo_color": "#6366f1",
        "features": ["Lowest rates for Gold+", "Midnight ZK verification", "60-month flexible terms"],
    },
    {
        "bank_id": "apex_credit",
        "name": "Apex Credit",
        "tagline": "Accessible credit for every eligible borrower",
        "min_score": 510,
        "min_tier": 1,
        "max_loan": 2_000_000,
        "interest_rate": 22.0,
        "term_months": 24,
        "logo_color": "#f59e0b",
        "features": ["Bronze tier eligible", "Fast 24-hour approval", "Flexible 24-month terms"],
    },
    {
        "bank_id": "horizon_defi",
        "name": "Horizon DeFi",
        "tagline": "Decentralised lending on the Midnight blockchain",
        "min_score": 600,
        "min_tier": 2,
        "max_loan": 3_000_000,
        "interest_rate": 17.5,
        "term_months": 36,
        "logo_color": "#10b981",
        "features": ["Silver tier eligible", "On-chain settlement", "Privacy-first ZK proof"],
    },
]

_BANK_BY_ID: dict[str, dict] = {b["bank_id"]: b for b in SEEDED_BANKS}


def get_bank(bank_id: str) -> dict | None:
    return _BANK_BY_ID.get(bank_id)


def compute_approval_probability(score: int, tier: int, bank: dict) -> int:
    """Return 0-100 approval probability given borrower score/tier vs bank criteria."""
    if tier < bank["min_tier"] or score < bank["min_score"]:
        return 0
    margin = score - bank["min_score"]
    return min(98, 60 + min(38, margin // 5))
