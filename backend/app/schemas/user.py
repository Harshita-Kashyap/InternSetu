from datetime import datetime

from typing import Literal

from pydantic import BaseModel, ConfigDict


class SettingsUpdate(BaseModel):
    preferred_language: Literal["en", "hi", "mr"]  # only used by the apps to pick the UI language


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str | None
    mobile: str | None
    role: str
    preferred_language: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
