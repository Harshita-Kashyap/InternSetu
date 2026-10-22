from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.engine.profile import KNOWN_DURATIONS

_LISTS = ("skill_ids", "interest_ids", "preferred_role_ids", "preferred_sector_ids", "preferred_location_ids")


class ProfileUpdate(BaseModel):
    """Send only the fields you want to change (save step by step). A list replaces the old list.
    Sending null for a single value clears it."""

    model_config = ConfigDict(extra="forbid")

    education_level_id: str | None = None
    degree_id: str | None = None
    field_of_study_id: str | None = None
    year_of_completion: int | None = Field(None, ge=1980, le=2040)
    skill_ids: list[str] | None = Field(None, max_length=80)
    interest_ids: list[str] | None = Field(None, max_length=30)
    preferred_role_ids: list[str] | None = Field(None, max_length=30)
    preferred_sector_ids: list[str] | None = Field(None, max_length=30)
    home_location_id: str | None = None
    preferred_location_ids: list[str] | None = Field(None, max_length=30)
    willing_to_relocate: bool | None = None
    willing_to_travel: bool | None = None
    duration_preference: str | None = None  # e.g. "2 months" (GET /taxonomy/durations)
    stipend_expectation: int | None = Field(None, ge=0, le=1_000_000)

    @field_validator("duration_preference")
    @classmethod
    def known_duration(cls, v):
        if v is not None and v not in KNOWN_DURATIONS:
            raise ValueError(f"Choose one of: {', '.join(KNOWN_DURATIONS)}.")
        return v

    @field_validator(*_LISTS)
    @classmethod
    def dedupe(cls, v):
        return list(dict.fromkeys(v)) if v is not None else v


class ProfileResponse(BaseModel):
    status: str                    # draft | complete
    missing_fields: list[str]
    education_level_id: str | None
    degree_id: str | None
    field_of_study_id: str | None
    year_of_completion: int | None
    skill_ids: list[str]
    interest_ids: list[str]
    preferred_role_ids: list[str]
    preferred_sector_ids: list[str]
    home_location_id: str | None
    preferred_location_ids: list[str]
    willing_to_relocate: bool
    willing_to_travel: bool
    duration_preference: str | None
    stipend_expectation: int | None
    updated_at: datetime
