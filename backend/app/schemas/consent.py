from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ConsentRecord(BaseModel):
    id: int
    purpose: str
    version: str
    given_at: datetime
    withdrawn_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class ConsentStatusResponse(BaseModel):
    has_active_consent: bool
    current_version: str
    records: list[ConsentRecord]


class DeleteAccountRequest(BaseModel):
    """Confirm with the password OR with the 6-digit code emailed by POST /me/delete-code."""
    password: str | None = Field(default=None, max_length=200)
    code: str | None = Field(default=None, max_length=6)

    @model_validator(mode="after")
    def _one_proof(self):
        if not (self.password or self.code):
            raise ValueError("Enter your password or the emailed code.")
        return self
