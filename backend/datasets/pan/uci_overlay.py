"""Overlay UCI Credit Approval (CC-BY 4.0) onto our FeatureVector schema with a
synthetic PAN per row. See uci/uci_mapping.md for the full mapping rationale.

Usage:
    # 1. Fetch the raw dataset once:
    curl -fsSL -o backend/datasets/pan/uci/crx.data \\
      https://archive.ics.uci.edu/ml/machine-learning-databases/credit-screening/crx.data

    # 2. Run the overlay:
    uv run python -m datasets.pan.uci_overlay \\
        --in backend/datasets/pan/uci/crx.data \\
        --out backend/datasets/pan/uci/credit_approval_with_pan.csv
"""

from __future__ import annotations

import argparse
import csv
import re
import zlib
from pathlib import Path

_UCI_COLUMNS = ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8",
                "A9", "A10", "A11", "A12", "A13", "A14", "A15", "class"]
_OUT_COLUMNS = [
    "pan", "monthly_income", "monthly_emi_obligations", "dpd_max_12m",
    "missed_emi_12m", "has_settled_account", "credit_history_months",
    "hard_inquiries_6m", "credit_card_utilization", "active_loan_accounts",
    "secured_loans_count", "employment_type", "employment_months",
    "bank_bounce_count_12m", "itr_filed", "existing_cibil_score",
    "signed_by", "uci_class",
]
_PAN_RE = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")


def _synth_pan(row_index: int) -> str:
    """Deterministic synthetic PAN — always starts with ZK to signal synthetic."""
    h = f"{zlib.crc32(str(row_index).encode()):08x}"[:3].upper()
    pan = f"ZK{h}{row_index % 10000:04d}U"
    assert _PAN_RE.match(pan), f"generated invalid PAN: {pan}"
    return pan


def _f(val: str, default: float = 0.0) -> float:
    try:
        return float(val)
    except ValueError:
        return default


def _employment_type(a6: str, a10: str) -> str:
    if a10 == "f":
        return "unemployed"
    if a6 in {"a", "b", "c"}:
        return "salaried"
    if a6 in {"d", "e", "i", "j"}:
        return "self_employed"
    return "salaried"


def _rescale_cibil(a11: str) -> int | None:
    try:
        raw = int(a11)
    except ValueError:
        return None
    # UCI A11 range is 0-67; map linearly to 300-900.
    return max(300, min(900, int(300 + (raw / 67.0) * 600)))


def map_row(row: dict, row_index: int) -> dict:
    a2 = _f(row["A2"])
    a3 = _f(row["A3"])
    a8 = _f(row["A8"])
    a9 = (row.get("A9") or "").strip().lower()
    a10 = (row.get("A10") or "").strip().lower()
    a11_raw = (row.get("A11") or "0").strip()
    a15 = _f(row["A15"])

    employment_months = int(a8 * 12) if a8 > 0 else int(a2 * 12 // 5)  # rough fallback
    monthly_income = a15 / 12.0 if a15 > 0 else 0.0
    if a10 == "f":
        monthly_income = 0.0

    try:
        a11_int = int(a11_raw)
    except ValueError:
        a11_int = 0

    return {
        "pan": _synth_pan(row_index),
        "monthly_income": round(monthly_income or 1.0, 2),  # avoid 0 to satisfy >0 validator
        "monthly_emi_obligations": round(a3 * 1000, 2),
        "dpd_max_12m": 0,
        "missed_emi_12m": 0,
        "has_settled_account": "true" if a9 == "t" else "false",
        "credit_history_months": 24,
        "hard_inquiries_6m": a11_int // 10,
        "credit_card_utilization": 0.3,
        "active_loan_accounts": 1 + a11_int // 20,
        "secured_loans_count": 0,
        "employment_type": _employment_type(
            (row.get("A6") or "").strip().lower(),
            a10,
        ),
        "employment_months": max(0, employment_months),
        "bank_bounce_count_12m": 0,
        "itr_filed": "true" if a9 == "t" else "false",
        "existing_cibil_score": _rescale_cibil(a11_raw) or "",
        "signed_by": "UCI_Synthetic_PAN",
        "uci_class": row.get("class", "").strip(),
    }


def load_uci(path: Path) -> list[dict]:
    rows: list[dict] = []
    with path.open() as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            cells = [c.strip() for c in line.split(",")]
            if len(cells) != len(_UCI_COLUMNS):
                continue  # malformed line
            rows.append(dict(zip(_UCI_COLUMNS, cells)))
    return rows


def overlay(src: Path, dest: Path) -> int:
    rows = load_uci(src)
    dest.parent.mkdir(parents=True, exist_ok=True)
    with dest.open("w", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=_OUT_COLUMNS)
        writer.writeheader()
        for i, row in enumerate(rows):
            writer.writerow(map_row(row, i))
    return len(rows)


def _cli() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--in", dest="src", type=Path,
                    default=Path("datasets/pan/uci/crx.data"))
    ap.add_argument("--out", type=Path,
                    default=Path("datasets/pan/uci/credit_approval_with_pan.csv"))
    args = ap.parse_args()

    if not args.src.exists():
        raise SystemExit(
            f"Input file not found: {args.src}\n"
            "Fetch it once with:\n"
            "  curl -fsSL -o backend/datasets/pan/uci/crx.data \\\n"
            "    https://archive.ics.uci.edu/ml/machine-learning-databases/credit-screening/crx.data"
        )

    n = overlay(args.src, args.out)
    print(f"Wrote {n} rows → {args.out}")


if __name__ == "__main__":
    _cli()
