from dataclasses import dataclass

# India-aligned credit scoring — CIBIL-style 300-900 display scale
#
# Raw score: 0-100 points across five factors + adjustment
# Display:   300 + raw * 6  → 300-900
#
# Tier thresholds (CIBIL scale):
#   Prime  780+   → income-linked up to ₹1Cr  (36× monthly, 65% FOIR)
#   Gold   690-779 → income-linked up to ₹50L  (28× monthly, 60% FOIR)
#   Silver 600-689 → income-linked up to ₹20L  (20× monthly, 55% FOIR)
#   Bronze 510-599 → income-linked up to ₹5L   (12× monthly, 50% FOIR)
#   None   300-509 → no loan
#
# Loan limit formula: clamp(income_multiple × monthly_income, floor, cap)
# also FOIR-capped: available EMI headroom × annuity factor at tier rate

_TIERS = [
    # (cibil_lo, cibil_hi, tier_id, label, income_mult, floor_inr, cap_inr, apr_pct, term_months, foir_threshold)
    # Caps reflect Indian personal loan market: Prime borrowers earning ₹5L+/month can access ₹1Cr+.
    (780, 901, 4, "Prime",  36,  500_000, 10_000_000, 10.5, 60, 0.65),
    (690, 780, 3, "Gold",   28,  250_000,  5_000_000, 14.0, 36, 0.60),
    (600, 690, 2, "Silver", 20,  100_000,  2_000_000, 18.0, 24, 0.55),
    (510, 600, 1, "Bronze", 12,   30_000,    500_000, 24.0, 12, 0.50),
    (300, 510, 0, "None",    0,        0,          0, None, None, 0.50),
]

# Thin-file cap: borrowers with no credit history and no active products
# cannot have scored well on repayment — their "clean" slate is uninformative.
# Real CIBIL gives "NH". We cap raw at 40 → CIBIL ~540 (low Bronze).
_THIN_FILE_RAW_CAP = 40


def _to_cibil(raw: int) -> int:
    return 300 + int(max(0, min(100, raw)) * 6)


def _income_loan_limit(
    tier_id: int,
    income_mult: int,
    floor_inr: int,
    cap_inr: int,
    monthly_income: float,
    monthly_emi: float,
    apr_pct: float | None,
    term_months: int | None,
    foir_threshold: float = 0.50,
) -> int:
    if tier_id == 0 or apr_pct is None or term_months is None:
        return 0

    # Income-multiple base
    base = int(income_mult * monthly_income)

    # FOIR cap: lender allows total EMI ≤ foir_threshold of income (tier-specific)
    # Available EMI headroom = foir_threshold × income - existing EMIs
    headroom = max(0.0, foir_threshold * monthly_income - monthly_emi)
    if headroom > 0:
        r = apr_pct / (12 * 100)
        n = term_months
        # PV of annuity: how much loan headroom_emi can service
        foir_cap = int(headroom * ((1 - (1 + r) ** -n) / r))
    else:
        foir_cap = 0

    # Take the tighter of the two limits, then clamp to floor/cap
    limit = min(base, foir_cap) if foir_cap > 0 else base
    return max(floor_inr, min(limit, cap_inr))


@dataclass
class ScoreResult:
    score: int
    tier: int
    tier_label: str
    loan_limit: int
    interest_rate: str | None
    term_months: int | None
    payment_pts: int    # max 35
    foir_pts: int       # max 25
    history_pts: int    # max 15
    credit_mix_pts: int # max 15
    inquiry_pts: int    # max 10
    adjustment: int


def _payment_pts(dpd_max: int, missed: int, settled: bool) -> int:
    """Payment history — 35 pts max."""
    if settled:
        return 0
    if dpd_max > 90 or missed >= 5:
        return 0
    if dpd_max > 60 or missed >= 3:
        return max(0, 8 - missed * 2)
    if dpd_max > 30 or missed >= 1:
        return max(0, 18 - missed * 3)
    if dpd_max > 0:
        return 26
    return 35


def _foir_pts(monthly_emi: float, monthly_income: float) -> int:
    """FOIR (Fixed Obligation to Income Ratio) — 25 pts max."""
    ratio = monthly_emi / monthly_income if monthly_income > 0 else 1.0
    if ratio <= 0.20: return 25
    if ratio <= 0.30: return 20
    if ratio <= 0.40: return 14
    if ratio <= 0.50: return 8
    if ratio <= 0.60: return 3
    return 0


def _history_pts(months: int) -> int:
    """Age of oldest credit account — 15 pts max."""
    if months >= 84: return 15
    if months >= 60: return 12
    if months >= 36: return 9
    if months >= 24: return 6
    if months >= 12: return 3
    if months >= 6:  return 1
    return 0


def _credit_mix_pts(
    cc_util: float,
    active_loans: int,
    secured_loans: int,
    credit_history_months: int,
) -> int:
    """Credit utilization + loan mix — 15 pts max.

    If the borrower has no credit history and no active loans, they have no
    credit products at all. Their 0% util is uninformative — do not reward it.
    """
    thin_file = credit_history_months == 0 and active_loans == 0

    if thin_file:
        # No credit products → 0 pts for CC util; minimal for mix
        util = 0
        mix  = 1   # tiny positive: at least they exist
    else:
        if cc_util <= 0.20:   util = 6
        elif cc_util <= 0.30: util = 5
        elif cc_util <= 0.50: util = 3
        elif cc_util <= 0.75: util = 1
        else:                 util = 0

        if 1 <= active_loans <= 3 and secured_loans > 0: mix = 9
        elif 1 <= active_loans <= 3:                     mix = 7
        elif active_loans == 0:                          mix = 3
        elif active_loans <= 5:                          mix = 5
        else:                                            mix = 2

    return min(util + mix, 15)


def _inquiry_pts(hard_inquiries_6m: int) -> int:
    """Hard inquiries in last 6 months — 10 pts max."""
    if hard_inquiries_6m == 0: return 10
    if hard_inquiries_6m == 1: return 8
    if hard_inquiries_6m == 2: return 5
    if hard_inquiries_6m == 3: return 2
    return 0


def _calc_adjustment(
    employment_type: str,
    employment_months: int,
    bank_bounce_count: int,
    itr_filed: bool,
    existing_cibil_score: int | None,
) -> int:
    adj = 0
    etype = employment_type.lower()

    if etype == "salaried":
        if employment_months >= 36:   adj += 4
        elif employment_months >= 24: adj += 2
        elif employment_months >= 12: adj += 1
        elif employment_months < 6:   adj -= 2   # very new job, higher risk
    elif etype in ("self_employed", "business_owner"):
        if employment_months >= 36:   adj += 2
        elif employment_months >= 24: adj += 1
        elif employment_months < 12:  adj -= 2
    elif etype == "unemployed":
        adj -= 10

    if bank_bounce_count == 0:   adj += 1
    elif bank_bounce_count <= 2: adj -= 3
    elif bank_bounce_count <= 4: adj -= 6
    else:                        adj -= 10

    if itr_filed:
        adj += 2

    if existing_cibil_score is not None:
        if existing_cibil_score >= 780:   adj += 5
        elif existing_cibil_score >= 750: adj += 3
        elif existing_cibil_score >= 700: adj += 1
        elif existing_cibil_score < 650:  adj -= 3
        elif existing_cibil_score < 600:  adj -= 6

    return adj


def compute_score(
    monthly_income: float,
    monthly_emi_obligations: float,
    dpd_max_12m: int,
    missed_emi_12m: int,
    has_settled_account: bool,
    credit_history_months: int,
    hard_inquiries_6m: int,
    credit_card_utilization: float,
    active_loan_accounts: int,
    secured_loans_count: int,
    employment_type: str,
    employment_months: int,
    bank_bounce_count_12m: int,
    itr_filed: bool,
    existing_cibil_score: int | None,
) -> ScoreResult:
    pay  = _payment_pts(dpd_max_12m, missed_emi_12m, has_settled_account)
    foir_pts = _foir_pts(monthly_emi_obligations, monthly_income)
    hist = _history_pts(credit_history_months)
    mix  = _credit_mix_pts(
        credit_card_utilization, active_loan_accounts,
        secured_loans_count, credit_history_months,
    )
    inq  = _inquiry_pts(hard_inquiries_6m)
    adj  = _calc_adjustment(
        employment_type, employment_months,
        bank_bounce_count_12m, itr_filed, existing_cibil_score,
    )

    raw_total = max(0, pay + foir_pts + hist + mix + inq + adj)

    # Thin-file cap: no credit history + no active products → uninformative "clean" record
    thin_file = credit_history_months == 0 and active_loan_accounts == 0
    if thin_file:
        raw_total = min(raw_total, _THIN_FILE_RAW_CAP)

    raw_total = min(raw_total, 100)
    cibil = _to_cibil(raw_total)

    for lo, hi, tier_id, label, mult, floor_inr, cap_inr, rate, term, foir_thresh in _TIERS:
        if lo <= cibil < hi:
            rate_str = f"{rate}%" if rate is not None else None
            limit = _income_loan_limit(
                tier_id, mult, floor_inr, cap_inr,
                monthly_income, monthly_emi_obligations,
                rate, term, foir_thresh,
            )
            return ScoreResult(
                score=cibil, tier=tier_id, tier_label=label,
                loan_limit=limit, interest_rate=rate_str, term_months=term,
                payment_pts=pay, foir_pts=foir_pts, history_pts=hist,
                credit_mix_pts=mix, inquiry_pts=inq, adjustment=adj,
            )

    return ScoreResult(cibil, 0, "None", 0, None, None, pay, foir_pts, hist, mix, inq, adj)
