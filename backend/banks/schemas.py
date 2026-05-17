from typing import Literal
from pydantic import BaseModel, Field


class Bank(BaseModel):
    bank_id: str
    name: str
    tagline: str
    min_score: int
    min_tier: int
    max_loan: int
    interest_rate: float
    term_months: int
    logo_color: str
    features: list[str]
    approval_probability: int | None = None


class LoanRequestCreate(BaseModel):
    bank_id: str
    report_id: str
    amount: int = Field(gt=0)
    score: int = Field(ge=300, le=900)
    tier: int = Field(ge=0, le=4)
    tier_label: str


class ApprovalDecision(BaseModel):
    """Bank-side decision on a pending loan request.

    For status == 'countered', the bank must supply at least one of
    counter_amount / counter_rate / counter_term_months — that's what makes
    it a counter rather than a flat approval. The borrower then accepts or
    declines via /loan-requests/{id}/counter-response.
    """
    status: Literal['approved', 'rejected', 'countered']
    message: str | None = None
    tx_hash: str | None = None
    counter_amount: int | None = Field(default=None, ge=1)
    counter_rate: float | None = Field(default=None, ge=0, le=100)
    counter_term_months: int | None = Field(default=None, ge=1, le=120)


class CounterResponse(BaseModel):
    """Borrower's response to a bank's counter-offer."""
    decision: Literal['accepted', 'declined']


class LoanRequest(BaseModel):
    request_id: str
    user_id: str
    bank_id: str
    bank_name: str
    report_id: str
    amount: int
    tier: int
    tier_label: str
    score: int = 0
    status: Literal['pending', 'approved', 'rejected', 'countered']
    created_at: str
    updated_at: str
    message: str | None
    tx_hash: str | None
    borrower_name: str | None = None
    approval_probability: int | None = None
    risk_score: int | None = None
    risk_label: str | None = None
    # Counter-offer fields — populated only when the bank countered the application
    counter_amount: int | None = None
    counter_rate: float | None = None
    counter_term_months: int | None = None
