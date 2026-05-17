"""Loan amortisation — pure helpers, no I/O.

Generates a fixed-EMI schedule using the standard annuity formula:

    EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)

where P = principal, r = monthly rate (apr / 12 / 100), n = term in months.

Each row breaks out principal vs interest and tracks remaining balance.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timezone
from typing import Literal


EmiStatus = Literal["paid", "due", "overdue", "upcoming"]


@dataclass
class EmiRow:
    seq: int                 # 1-based EMI number
    due_date: str            # ISO date 'YYYY-MM-DD'
    principal: int           # principal repaid this EMI (rounded)
    interest: int            # interest paid this EMI (rounded)
    emi: int                 # principal + interest (rounded total)
    balance: int             # principal balance after this EMI (rounded)
    status: EmiStatus


@dataclass
class Schedule:
    principal: int
    apr_pct: float
    term_months: int
    emi: int                 # monthly EMI (rounded)
    total_interest: int
    total_paid: int
    rows: list[EmiRow]
    paid_count: int
    fully_repaid: bool


def _parse_apr(apr: str | float | None) -> float:
    """Accepts '14.0%', '14.0', 14.0, or None — returns float percent."""
    if apr is None:
        return 0.0
    if isinstance(apr, (int, float)):
        return float(apr)
    s = str(apr).strip().rstrip("%").strip()
    return float(s) if s else 0.0


def _add_months(d: date, months: int) -> date:
    """Add `months` to `d` clamping the day to the target month's last day."""
    new_month = d.month - 1 + months
    new_year = d.year + new_month // 12
    new_month = new_month % 12 + 1
    # Clamp the day so e.g. Jan 31 + 1 month → Feb 28/29
    if new_month == 2:
        last_day = 29 if (new_year % 4 == 0 and (new_year % 100 != 0 or new_year % 400 == 0)) else 28
    elif new_month in (4, 6, 9, 11):
        last_day = 30
    else:
        last_day = 31
    return date(new_year, new_month, min(d.day, last_day))


def _row_status(due: date, today: date, paid: bool) -> EmiStatus:
    if paid:
        return "paid"
    if due < today:
        return "overdue"
    if due == today:
        return "due"
    return "upcoming"


def generate_schedule(
    principal: int,
    apr: str | float | None,
    term_months: int | None,
    start_date: date | None = None,
    paid_count: int = 0,
    today: date | None = None,
) -> Schedule:
    """Build the amortisation schedule for a loan.

    `paid_count` marks the first N EMIs as paid (we don't track partial payments).
    `start_date` is the loan issue date; the first EMI is due one month later.
    `today` is injectable for deterministic tests.
    """
    apr_pct = _parse_apr(apr)
    n = int(term_months or 0)
    if principal <= 0 or n <= 0:
        return Schedule(principal=principal, apr_pct=apr_pct, term_months=n,
                        emi=0, total_interest=0, total_paid=0, rows=[],
                        paid_count=0, fully_repaid=True)

    start = start_date or date.today()
    today = today or date.today()
    r = apr_pct / 12 / 100

    if r == 0:
        emi_float = principal / n
    else:
        emi_float = principal * r * (1 + r) ** n / ((1 + r) ** n - 1)
    emi = round(emi_float)

    rows: list[EmiRow] = []
    balance = float(principal)
    total_interest = 0
    for i in range(1, n + 1):
        interest_i = balance * r
        principal_i = emi_float - interest_i
        balance = max(0.0, balance - principal_i)
        due = _add_months(start, i)
        paid = i <= paid_count
        rows.append(EmiRow(
            seq=i,
            due_date=due.isoformat(),
            principal=round(principal_i),
            interest=round(interest_i),
            emi=emi,
            balance=round(balance),
            status=_row_status(due, today, paid),
        ))
        total_interest += round(interest_i)

    fully_repaid = paid_count >= n
    return Schedule(
        principal=principal,
        apr_pct=apr_pct,
        term_months=n,
        emi=emi,
        total_interest=total_interest,
        total_paid=emi * paid_count,
        rows=rows,
        paid_count=paid_count,
        fully_repaid=fully_repaid,
    )


def schedule_to_dict(s: Schedule) -> dict:
    """Serialise a Schedule to a JSON-friendly dict for FastAPI."""
    return {
        "principal": s.principal,
        "apr_pct": s.apr_pct,
        "term_months": s.term_months,
        "emi": s.emi,
        "total_interest": s.total_interest,
        "total_paid": s.total_paid,
        "paid_count": s.paid_count,
        "fully_repaid": s.fully_repaid,
        "rows": [
            {
                "seq": r.seq,
                "due_date": r.due_date,
                "principal": r.principal,
                "interest": r.interest,
                "emi": r.emi,
                "balance": r.balance,
                "status": r.status,
            }
            for r in s.rows
        ],
    }


def parse_issued_date(iso: str | None) -> date:
    """Parse an ISO timestamp from the report. Falls back to today on failure."""
    if not iso:
        return date.today()
    try:
        return datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone(timezone.utc).date()
    except (ValueError, AttributeError):
        return date.today()
