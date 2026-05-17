import re
from datetime import date
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

UserRole = Literal['borrower', 'bank']


def _strong_password(v: str) -> str:
    if len(v) < 8:
        raise ValueError("Password must be at least 8 characters")
    if not re.search(r"[A-Za-z]", v):
        raise ValueError("Password must contain at least one letter")
    if not re.search(r"\d", v):
        raise ValueError("Password must contain at least one number")
    return v


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=128)
    date_of_birth: date
    profession: str = Field(default="", max_length=128)
    role: UserRole = 'borrower'

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _strong_password(v)

    @field_validator("date_of_birth")
    @classmethod
    def validate_age(cls, v: date) -> date:
        today = date.today()
        age = today.year - v.year - ((today.month, today.day) < (v.month, v.day))
        if age < 16:
            raise ValueError("You must be at least 16 years old to register")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class WalletLinkRequest(BaseModel):
    wallet_address: str = Field(min_length=1, max_length=128)


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _strong_password(v)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _strong_password(v)
