from pydantic import BaseModel, Field
from typing import Literal


EmploymentType = Literal["salaried", "self_employed", "business_owner", "unemployed"]


class ScoreRequest(BaseModel):
    # Income & EMI obligations (INR)
    monthly_income: float = Field(gt=0, description="Net monthly take-home income in INR")
    monthly_emi_obligations: float = Field(ge=0, description="Total existing EMIs per month in INR")

    # Payment history
    dpd_max_12m: int = Field(ge=0, le=365, description="Max days past due on any account in last 12 months")
    missed_emi_12m: int = Field(ge=0, le=24, description="Number of missed EMI payments in last 12 months")
    has_settled_account: bool = Field(default=False, description="Any loan settled/written-off in credit history")

    # Credit history
    credit_history_months: int = Field(ge=0, description="Age of oldest credit account in months")
    hard_inquiries_6m: int = Field(ge=0, le=20, description="Credit applications (hard pulls) in last 6 months")

    # Credit utilization & mix
    credit_card_utilization: float = Field(ge=0, le=1, description="Total CC balance / total CC limit")
    active_loan_accounts: int = Field(ge=0, description="Number of currently active loan accounts")
    secured_loans_count: int = Field(ge=0, description="Subset of active loans that are secured (home/car/gold)")

    # Employment
    employment_type: EmploymentType = Field(description="salaried | self_employed | business_owner | unemployed")
    employment_months: int = Field(ge=0, description="Months at current employer or in current business")

    # Banking behaviour
    bank_bounce_count_12m: int = Field(ge=0, description="ECS/NACH outward bounce count in last 12 months")

    # Compliance & optional reference
    itr_filed: bool = Field(default=False, description="Income Tax Return filed for last financial year")
    existing_cibil_score: int | None = Field(default=None, ge=300, le=900,
                                              description="Self-reported CIBIL score (optional)")

    signed_by: str = Field(default="unknown", description="Data source identifier")
    data_source: str = Field(default="upload", description="upload | form | pan")


class Breakdown(BaseModel):
    payment_pts: int       # max 35
    foir_pts: int          # max 25
    history_pts: int       # max 15
    credit_mix_pts: int    # max 15
    inquiry_pts: int       # max 10
    adjustment: int        # bonus/penalty (can be negative)


class ScoreResponse(BaseModel):
    report_id: str
    user_id: str = ""
    score: int
    tier: int
    tier_label: str
    loan_limit: int
    interest_rate: str | None
    term_months: int | None
    breakdown: Breakdown
    generated_at: str
    data_source: str = "upload"
    cached: bool = False
    loan_applied: bool = False
    loan_tx_hash: str | None = None
