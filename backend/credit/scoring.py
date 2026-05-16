from dataclasses import dataclass

# India-specific credit scoring model
# Aligned with CIBIL/Experian India methodology
# Total base score: 100 pts + adjustments, clamped to 0-100

# (min, max_exclusive, tier_id, label, loan_limit_tDUST, apr, term_months)
_TIERS = [
    (80, 101, 4, "Prime",  20000, "10.5%", 60),
    (65,  80, 3, "Gold",   7500,  "14%",   36),
    (50,  65, 2, "Silver", 2000,  "18%",   24),
    (35,  50, 1, "Bronze", 500,   "24%",   12),
    (0,   35, 0, "None",   0,     None,    None),
]


@dataclass
class ScoreResult:
    score: int
    tier: int
    tier_label: str
    loan_limit: int
    interest_rate: str | None
    term_months: int | None
    payment_pts: int      # max 35 — payment history (DPD, missed EMIs, settled accounts)
    foir_pts: int         # max 25 — Fixed Obligation-to-Income Ratio
    history_pts: int      # max 15 — credit history age
    credit_mix_pts: int   # max 15 — utilization + loan mix
    inquiry_pts: int      # max 10 — hard inquiries in last 6 months
    adjustment: int       # bonus/penalty from employment, bounces, ITR, CIBIL


def _payment_pts(dpd_max: int, missed: int, settled: bool) -> int:
    """Payment history — 35 pts max. Biggest single factor in India."""
    if settled:
        return 0
    if dpd_max > 90 or missed >= 5:
        return 0
    if dpd_max > 60 or missed >= 3:
        return max(0, 8 - missed * 2)
    if dpd_max > 30 or missed >= 1:
        return max(0, 18 - missed * 3)
    if dpd_max > 0:
        return 28   # late but under 30 DPD, no misses
    return 35       # perfect record


def _foir_pts(monthly_emi: float, monthly_income: float) -> int:
    """FOIR (Fixed Obligation to Income Ratio) — 25 pts max.
    Indian lenders typically cap FOIR at 50-55% for salaried applicants.
    """
    ratio = monthly_emi / monthly_income if monthly_income > 0 else 1.0
    if ratio <= 0.25:
        return 25
    if ratio <= 0.35:
        return 20
    if ratio <= 0.45:
        return 14
    if ratio <= 0.55:
        return 7
    return 0


def _history_pts(months: int) -> int:
    """Age of oldest credit account — 15 pts max."""
    if months >= 84:   # 7+ years
        return 15
    if months >= 60:   # 5-6 years
        return 13
    if months >= 36:   # 3-4 years
        return 10
    if months >= 24:   # 2 years
        return 7
    if months >= 12:   # 1 year
        return 4
    if months >= 6:    # 6-11 months
        return 2
    return 0


def _credit_mix_pts(cc_util: float, active_loans: int, secured_loans: int) -> int:
    """Credit utilization + loan mix — 15 pts max.
    Ideal: ≤30% utilization with a mix of secured and unsecured loans.
    """
    if cc_util <= 0.20:
        util = 6
    elif cc_util <= 0.30:
        util = 5
    elif cc_util <= 0.50:
        util = 3
    elif cc_util <= 0.75:
        util = 1
    else:
        util = 0

    if 1 <= active_loans <= 3 and secured_loans > 0:
        mix = 9   # optimal: moderate leverage with secured anchor
    elif 1 <= active_loans <= 3:
        mix = 7   # active but unsecured only
    elif active_loans == 0:
        mix = 4   # thin file — no active credit
    elif active_loans <= 5:
        mix = 5   # moderate over-leverage
    else:
        mix = 2   # heavily leveraged

    return min(util + mix, 15)


def _inquiry_pts(hard_inquiries_6m: int) -> int:
    """Hard inquiries in last 6 months — 10 pts max.
    Multiple applications in a short window is a strong distress signal.
    """
    if hard_inquiries_6m == 0:
        return 10
    if hard_inquiries_6m == 1:
        return 8
    if hard_inquiries_6m == 2:
        return 6
    if hard_inquiries_6m == 3:
        return 3
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

    # Employment stability
    if etype == "salaried":
        if employment_months >= 36:
            adj += 4
        elif employment_months >= 24:
            adj += 2
        elif employment_months >= 12:
            adj += 1
    elif etype in ("self_employed", "business_owner"):
        if employment_months >= 36:
            adj += 2
        elif employment_months >= 24:
            adj += 1
    elif etype == "unemployed":
        adj -= 8

    # Banking behaviour (ECS/NACH bounce rate)
    if bank_bounce_count == 0:
        adj += 1
    elif bank_bounce_count <= 2:
        adj -= 3
    else:
        adj -= 7

    # Tax compliance — signals formal income
    if itr_filed:
        adj += 2

    # CIBIL cross-reference (optional self-reported)
    if existing_cibil_score is not None:
        if existing_cibil_score >= 750:
            adj += 3
        elif existing_cibil_score >= 700:
            adj += 1
        elif existing_cibil_score < 600:
            adj -= 3

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
    foir = _foir_pts(monthly_emi_obligations, monthly_income)
    hist = _history_pts(credit_history_months)
    mix  = _credit_mix_pts(credit_card_utilization, active_loan_accounts, secured_loans_count)
    inq  = _inquiry_pts(hard_inquiries_6m)
    adj  = _calc_adjustment(
        employment_type, employment_months,
        bank_bounce_count_12m, itr_filed, existing_cibil_score,
    )

    total = max(0, min(100, pay + foir + hist + mix + inq + adj))

    for lo, hi, tier_id, label, limit, rate, term in _TIERS:
        if lo <= total < hi:
            return ScoreResult(
                score=total, tier=tier_id, tier_label=label,
                loan_limit=limit, interest_rate=rate, term_months=term,
                payment_pts=pay, foir_pts=foir, history_pts=hist,
                credit_mix_pts=mix, inquiry_pts=inq, adjustment=adj,
            )

    return ScoreResult(total, 0, "None", 0, None, None, pay, foir, hist, mix, inq, adj)
