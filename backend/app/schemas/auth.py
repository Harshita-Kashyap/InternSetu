from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.core.validators import clean_name, normalize_mobile, validate_password
from app.schemas.user import UserResponse

from app.core.languages import LanguageCode  # en, hi, mr, bn, te, ta, gu (server text falls back to English where untranslated)


def _blank_to_none(v):
    if isinstance(v, str) and not v.strip():
        return None
    return v


class RegisterRequest(BaseModel):
    """Sign-up needs a real email, a password, and the 6-digit code emailed by POST /auth/register-code."""
    full_name: str = Field(max_length=150)
    email: EmailStr
    mobile: str | None = None   # optional extra contact; login is by email or mobile + password
    password: str
    code: str = Field(min_length=6, max_length=6)
    consent: bool
    preferred_language: LanguageCode = "en"

    @field_validator("mobile", mode="before")
    @classmethod
    def blank_to_none(cls, v):
        return _blank_to_none(v)

    @field_validator("full_name")
    @classmethod
    def check_name(cls, v: str) -> str:
        return clean_name(v)

    @field_validator("email")
    @classmethod
    def check_email(cls, v):
        return v.lower()

    @field_validator("mobile")
    @classmethod
    def check_mobile(cls, v):
        return normalize_mobile(v) if v else v

    @field_validator("password")
    @classmethod
    def check_password(cls, v: str) -> str:
        return validate_password(v)

    @field_validator("consent")
    @classmethod
    def must_consent(cls, v: bool) -> bool:
        if not v:
            raise ValueError("You must agree to the privacy notice to register.")
        return v


class RegisterCodeRequest(BaseModel):
    email: EmailStr

    @field_validator("email")
    @classmethod
    def lower(cls, v):
        return v.lower()


class LoginRequest(BaseModel):
    identifier: str = Field(min_length=1, max_length=255)  # email or mobile
    password: str = Field(min_length=1, max_length=200)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    user: UserResponse


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=200)
    new_password: str

    @field_validator("new_password")
    @classmethod
    def check_new_password(cls, v: str) -> str:
        return validate_password(v)


class ForgotPasswordRequest(BaseModel):
    identifier: str = Field(min_length=1, max_length=255)


class ResetPasswordRequest(BaseModel):
    identifier: str = Field(min_length=1, max_length=255)   # the email the code was sent to
    code: str = Field(min_length=6, max_length=6)
    new_password: str

    @field_validator("new_password")
    @classmethod
    def check_new_password(cls, v: str) -> str:
        return validate_password(v)


class MessageResponse(BaseModel):
    message: str
