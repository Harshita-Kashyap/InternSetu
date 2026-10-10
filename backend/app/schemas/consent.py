from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


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
    password: str = Field(min_length=1, max_length=200)
