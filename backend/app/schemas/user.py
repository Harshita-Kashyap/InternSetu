from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str | None
    mobile: str | None
    role: str
    preferred_language: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
