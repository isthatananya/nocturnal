"""Synthetic PAN-card credit dataset generator.

Generates Indian-realistic feature vectors that pass through ``compute_score`` into
each of the five tiers. Each record carries a synthetic PAN matching the official
format ``^[A-Z]{5}[0-9]{4}[A-Z]$``.

Distribution shapes are sourced from RBI and NSO public statistics — see the
README in this folder for citations.

Usage:
    uv run python -m datasets.pan.generate \\
        --count 100 --seed 42 \\
        --out backend/datasets/pan/generated/pan_corpus.csv \\
        --profiles-out backend/datasets/pan/generated/pan_profiles.json
"""

from __future__ import annotations

import argparse
import csv
import json
import random
import re
import string
from dataclasses import asdict, dataclass
from pathlib import Path

import numpy as np
from faker import Faker

from credit.scoring import compute_score

_TIERS = ("None", "Bronze", "Silver", "Gold", "Prime")
_PAN_RE = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")
_MAX_TRIES_PER_ROW = 1000


@dataclass
class Record:
    pan: str
    monthly_income: float
    monthly_emi_obligations: float
    dpd_max_12m: int
    missed_emi_12m: int
    has_settled_account: bool
    credit_history_months: int
    hard_inquiries_6m: int
    credit_card_utilization: float
    active_loan_accounts: int
    secured_loans_count: int
    employment_type: str
    employment_months: int
    bank_bounce_count_12m: int
    itr_filed: bool
    existing_cibil_score: int | None
    signed_by: str
    expected_tier: str


# ── PAN string generation ────────────────────────────────────────────────────

def _make_pan(faker: Faker) -> str:
    """AAAPL1234C — 5 letters, 4 digits, 1 letter. Synthetic only."""
    while True:
        candidate = (
            "".join(faker.random_choices(string.ascii_uppercase, length=5))
            + "".join(faker.random_choices(string.digits, length=4))
            + faker.random_element(string.ascii_uppercase)
        )
        if _PAN_RE.match(candidate):
            return candidate


# ── Tier-conditioned feature samplers ────────────────────────────────────────
# Bin probabilities derived from RBI/NSO sources; see README.md.

def _sample_features(rng: random.Random, np_rng: np.random.Generator, tier: str) -> dict:
    """Draw a candidate FeatureVector tuned toward the target tier."""

    if tier == "Prime":
        income = float(np_rng.choice([90_000, 120_000, 150_000, 200_000], p=[0.25, 0.35, 0.25, 0.15]))
        emi_ratio = np_rng.uniform(0.05, 0.30)
        dpd = int(np_rng.choice([0, 0, 0, 7], p=[0.85, 0.05, 0.05, 0.05]))
        missed = 0
        cc_util = np_rng.uniform(0.05, 0.25)
        history = int(np_rng.choice([48, 60, 84, 120], p=[0.15, 0.30, 0.35, 0.20]))
        inquiries = int(np_rng.choice([0, 1], p=[0.7, 0.3]))
        active_loans = int(np_rng.choice([1, 2, 3], p=[0.25, 0.55, 0.20]))
        secured = min(active_loans, int(np_rng.choice([1, 2], p=[0.4, 0.6])))
        emp_type = "salaried"
        emp_months = int(np_rng.choice([36, 60, 84, 120], p=[0.20, 0.35, 0.30, 0.15]))
        bounces = 0
        itr = True
        cibil = int(np_rng.uniform(780, 850))
    elif tier == "Gold":
        income = float(np_rng.choice([55_000, 70_000, 90_000], p=[0.35, 0.40, 0.25]))
        emi_ratio = np_rng.uniform(0.20, 0.40)
        dpd = int(np_rng.choice([0, 15, 30], p=[0.55, 0.30, 0.15]))
        missed = int(np_rng.choice([0, 1], p=[0.7, 0.3]))
        cc_util = np_rng.uniform(0.25, 0.50)
        history = int(np_rng.choice([30, 42, 60, 72], p=[0.20, 0.30, 0.30, 0.20]))
        inquiries = int(np_rng.choice([1, 2, 3], p=[0.45, 0.40, 0.15]))
        active_loans = int(np_rng.choice([1, 2, 3], p=[0.30, 0.50, 0.20]))
        secured = min(active_loans, int(np_rng.choice([0, 1, 2], p=[0.2, 0.5, 0.3])))
        emp_type = str(np_rng.choice(["salaried", "self_employed"], p=[0.7, 0.3]))
        emp_months = int(np_rng.choice([18, 30, 48], p=[0.30, 0.40, 0.30]))
        bounces = int(np_rng.choice([0, 1], p=[0.7, 0.3]))
        itr = bool(np_rng.choice([True, False], p=[0.8, 0.2]))
        cibil = int(np_rng.uniform(690, 779))
    elif tier == "Silver":
        income = float(np_rng.choice([35_000, 50_000, 65_000], p=[0.40, 0.40, 0.20]))
        emi_ratio = np_rng.uniform(0.35, 0.55)
        dpd = int(np_rng.choice([15, 30, 45, 60], p=[0.25, 0.35, 0.25, 0.15]))
        missed = int(np_rng.choice([0, 1, 2], p=[0.45, 0.40, 0.15]))
        cc_util = np_rng.uniform(0.45, 0.70)
        history = int(np_rng.choice([18, 24, 36, 48], p=[0.25, 0.30, 0.30, 0.15]))
        inquiries = int(np_rng.choice([1, 2, 3], p=[0.35, 0.40, 0.25]))
        active_loans = int(np_rng.choice([1, 2], p=[0.55, 0.45]))
        secured = min(active_loans, int(np_rng.choice([0, 1], p=[0.5, 0.5])))
        emp_type = str(np_rng.choice(["salaried", "self_employed"], p=[0.5, 0.5]))
        emp_months = int(np_rng.choice([12, 24, 36], p=[0.30, 0.40, 0.30]))
        bounces = int(np_rng.choice([0, 1, 2], p=[0.5, 0.35, 0.15]))
        itr = bool(np_rng.choice([True, False], p=[0.55, 0.45]))
        cibil = int(np_rng.uniform(600, 689))
    elif tier == "Bronze":
        income = float(np_rng.choice([18_000, 25_000, 32_000], p=[0.35, 0.40, 0.25]))
        emi_ratio = np_rng.uniform(0.40, 0.60)
        dpd = int(np_rng.choice([30, 45, 60], p=[0.30, 0.40, 0.30]))
        missed = int(np_rng.choice([1, 2], p=[0.6, 0.4]))
        cc_util = np_rng.uniform(0.60, 0.85)
        history = int(np_rng.choice([12, 18, 24], p=[0.30, 0.40, 0.30]))
        inquiries = int(np_rng.choice([2, 3, 4], p=[0.30, 0.40, 0.30]))
        active_loans = int(np_rng.choice([1, 2], p=[0.6, 0.4]))
        secured = 0
        emp_type = str(np_rng.choice(["salaried", "self_employed"], p=[0.5, 0.5]))
        emp_months = int(np_rng.choice([6, 12, 18], p=[0.30, 0.40, 0.30]))
        bounces = int(np_rng.choice([1, 2], p=[0.6, 0.4]))
        itr = bool(np_rng.choice([True, False], p=[0.3, 0.7]))
        cibil = None
    else:  # None
        income = float(np_rng.choice([12_000, 18_000, 24_000], p=[0.35, 0.40, 0.25]))
        emi_ratio = np_rng.uniform(0.50, 0.75)
        dpd = int(np_rng.choice([60, 90, 120], p=[0.30, 0.40, 0.30]))
        missed = int(np_rng.choice([3, 4, 5], p=[0.30, 0.45, 0.25]))
        cc_util = np_rng.uniform(0.80, 0.98)
        history = int(np_rng.choice([0, 6, 12], p=[0.30, 0.40, 0.30]))
        inquiries = int(np_rng.choice([4, 5, 6], p=[0.30, 0.40, 0.30]))
        active_loans = int(np_rng.choice([0, 1], p=[0.5, 0.5]))
        secured = 0
        emp_type = str(np_rng.choice(["self_employed", "unemployed"], p=[0.6, 0.4]))
        emp_months = int(np_rng.choice([0, 3, 6], p=[0.30, 0.40, 0.30]))
        bounces = int(np_rng.choice([3, 4, 5], p=[0.30, 0.40, 0.30]))
        itr = False
        cibil = None

    return {
        "monthly_income": round(income, 2),
        "monthly_emi_obligations": round(income * emi_ratio, 2),
        "dpd_max_12m": dpd,
        "missed_emi_12m": missed,
        "has_settled_account": False,
        "credit_history_months": history,
        "hard_inquiries_6m": inquiries,
        "credit_card_utilization": round(cc_util, 3),
        "active_loan_accounts": active_loans,
        "secured_loans_count": secured,
        "employment_type": emp_type,
        "employment_months": emp_months,
        "bank_bounce_count_12m": bounces,
        "itr_filed": itr,
        "existing_cibil_score": cibil,
    }


# ── Scoring + rejection sampling ─────────────────────────────────────────────

def _tier_matches(features: dict, target: str) -> bool:
    result = compute_score(**features)
    return result.tier_label == target


def _generate_record(
    target: str,
    faker: Faker,
    rng: random.Random,
    np_rng: np.random.Generator,
) -> Record:
    for _ in range(_MAX_TRIES_PER_ROW):
        features = _sample_features(rng, np_rng, target)
        if _tier_matches(features, target):
            return Record(
                pan=_make_pan(faker),
                signed_by="Synthetic_Bureau",
                expected_tier=target,
                **features,
            )
    raise RuntimeError(
        f"Could not synthesize a {target}-tier record in {_MAX_TRIES_PER_ROW} tries"
    )


def generate(count_per_tier: int, seed: int) -> list[Record]:
    rng = random.Random(seed)
    np_rng = np.random.default_rng(seed)
    faker = Faker("en_IN")
    Faker.seed(seed)
    out: list[Record] = []
    for tier in _TIERS:
        for _ in range(count_per_tier):
            out.append(_generate_record(tier, faker, rng, np_rng))
    return out


# ── Output writers ───────────────────────────────────────────────────────────

_CSV_COLUMNS = [
    "pan", "monthly_income", "monthly_emi_obligations", "dpd_max_12m",
    "missed_emi_12m", "has_settled_account", "credit_history_months",
    "hard_inquiries_6m", "credit_card_utilization", "active_loan_accounts",
    "secured_loans_count", "employment_type", "employment_months",
    "bank_bounce_count_12m", "itr_filed", "existing_cibil_score",
    "signed_by", "expected_tier",
]


def write_csv(records: list[Record], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=_CSV_COLUMNS)
        writer.writeheader()
        for r in records:
            row = asdict(r)
            # CSV-friendly representation
            row["has_settled_account"] = "true" if row["has_settled_account"] else "false"
            row["itr_filed"] = "true" if row["itr_filed"] else "false"
            if row["existing_cibil_score"] is None:
                row["existing_cibil_score"] = ""
            writer.writerow(row)


def write_profiles_json(records: list[Record], path: Path) -> None:
    """Emit the 20-row profile index consumed by mockPanLookup (4 per tier)."""
    by_tier: dict[str, list[Record]] = {t: [] for t in _TIERS}
    for r in records:
        if len(by_tier[r.expected_tier]) < 4:
            by_tier[r.expected_tier].append(r)
    # Index order: None (0-3), Bronze (4-7), Silver (8-11), Gold (12-15), Prime (16-19)
    ordered: list[Record] = []
    for tier in _TIERS:
        ordered.extend(by_tier[tier])
    profiles = []
    for r in ordered:
        d = asdict(r)
        del d["pan"]
        del d["expected_tier"]
        d["data_source"] = "pan"
        profiles.append(d)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"profiles": profiles}, indent=2))


# ── CLI ──────────────────────────────────────────────────────────────────────

def _cli() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--count", type=int, default=20,
                    help="Rows per tier (5 tiers total)")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--out", type=Path,
                    default=Path("datasets/pan/generated/pan_corpus.csv"))
    ap.add_argument("--profiles-out", type=Path,
                    default=Path("datasets/pan/generated/pan_profiles.json"))
    args = ap.parse_args()

    records = generate(args.count, args.seed)
    write_csv(records, args.out)
    write_profiles_json(records, args.profiles_out)
    print(f"Wrote {len(records)} records → {args.out}")
    print(f"Wrote 20-row profile index → {args.profiles_out}")


if __name__ == "__main__":
    _cli()
