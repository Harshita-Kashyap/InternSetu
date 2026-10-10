from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.core.validators import clean_name, normalize_mobile, validate_password
from app.schemas.user import UserResponse

LanguageCode = Literal["en", "hi", "mr"]  # mr (Marathi) is the default regional language (TBD-7)


def _blank_to_none(v):
    if isinstance(v, str) and not v.strip():
        return None
    return v


class RegisterRequest(BaseModel):
    full_name: str = Field(max_length=150)
    email: EmailStr | None = None
    mobile: str | None = None
    password: str
    consent: bool
    preferred_language: LanguageCode = "en"

    @field_validator("email", "mobile", mode="before")
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
        return v.lower() if v else v

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
    def check_consent(cls, v: bool) -> bool:
        if v is not True:
            raise ValueError("You must accept the privacy notice to register.")
        return v

    @model_validator(mode="after")
    def need_contact(self):
        if not self.email and not self.mobile:
            raise ValueError("Enter an email or a mobile number.")
        return self


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


class MessageResponse(BaseModel):
    message: str
