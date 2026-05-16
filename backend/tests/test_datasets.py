"""Verify dataset rows score into their labeled tier when run through compute_score."""

from __future__ import annotations

import csv
from pathlib import Path

import pytest

from credit.scoring import compute_score

_REPO_BACKEND = Path(__file__).resolve().parent.parent
_DATASETS = _REPO_BACKEND / "datasets"

_TIER_FILES = {
    "Prime":  "upload/tier_prime.csv",
    "Gold":   "upload/tier_gold.csv",
    "Silver": "upload/tier_silver.csv",
    "Bronze": "upload/tier_bronze.csv",
    "None":   "upload/tier_none.csv",
}


def _coerce(row: dict) -> dict:
    """CSV row → kwargs for compute_score (ints / floats / bools / None)."""
    bools = {"has_settled_account", "itr_filed"}
    ints = {"dpd_max_12m", "missed_emi_12m", "credit_history_months",
            "hard_inquiries_6m", "active_loan_accounts", "secured_loans_count",
            "employment_months", "bank_bounce_count_12m"}
    floats = {"monthly_income", "monthly_emi_obligations", "credit_card_utilization"}
    out: dict = {}
    for k, v in row.items():
        if k in bools:
            out[k] = v.strip().lower() == "true"
        elif k in ints:
            out[k] = int(v)
        elif k in floats:
            out[k] = float(v)
        elif k == "existing_cibil_score":
            out[k] = int(v) if v.strip() else None
        elif k == "employment_type":
            out[k] = v
        # Drop pan, signed_by, expected_tier, etc. — not part of compute_score signature.
    return out


def _load_csv(path: Path) -> list[dict]:
    with path.open() as fh:
        return list(csv.DictReader(fh))


@pytest.mark.parametrize("tier,relpath", list(_TIER_FILES.items()))
def test_upload_tier_csv_scores_correctly(tier: str, relpath: str):
    path = _DATASETS / relpath
    rows = _load_csv(path)
    assert rows, f"{relpath} is empty"
    for i, raw in enumerate(rows):
        kwargs = _coerce(raw)
        result = compute_score(**kwargs)
        assert result.tier_label == tier, (
            f"{relpath} row {i + 1}: expected {tier}, got {result.tier_label} "
            f"(score={result.score})"
        )


def test_pan_corpus_each_row_matches_expected_tier():
    path = _DATASETS / "pan/generated/pan_corpus.csv"
    if not path.exists():
        pytest.skip("pan_corpus.csv not generated — run datasets.pan.generate first")
    rows = _load_csv(path)
    assert len(rows) >= 20, "expected at least 20 synthetic rows (4 per tier)"
    for i, raw in enumerate(rows):
        expected = raw["expected_tier"]
        kwargs = _coerce(raw)
        result = compute_score(**kwargs)
        assert result.tier_label == expected, (
            f"pan_corpus row {i + 1} (PAN {raw['pan']}): expected {expected}, "
            f"got {result.tier_label} (score={result.score})"
        )


def test_pan_corpus_pan_format():
    import re
    path = _DATASETS / "pan/generated/pan_corpus.csv"
    if not path.exists():
        pytest.skip("pan_corpus.csv not generated")
    pan_re = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")
    for raw in _load_csv(path):
        assert pan_re.match(raw["pan"]), f"invalid PAN format: {raw['pan']}"
