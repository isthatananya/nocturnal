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
    status: Literal['approved', 'rejected']
    message: str | None = None
    tx_hash: str | None = None


class LoanRequest(BaseModel):
    request_id: str
    user_id: str
    bank_id: str
    bank_name: str
    report_id: str
    amount: int
    tier: int
    tier_label: str
    status: Literal['pending', 'approved', 'rejected']
    created_at: str
    updated_at: str
    message: str | None
    tx_hash: str | None
    borrower_name: str | None = None
