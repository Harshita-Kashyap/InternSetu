from typing import Literal

from pydantic import BaseModel, field_validator

from app.core.validators import clean_free_text

EntryType = Literal[
    "education_level", "degree", "field_of_study", "skill_category", "skill",
    "sector", "role_domain", "role", "interest", "state", "city",
]


class TaxonomyItem(BaseModel):
    id: str
    name: str  # English. The UI translates by `id` (see docs/INTEGRATION.md)
    parent_id: str | None = None
    order_rank: int | None = None
    latitude: float | None = None
    longitude: float | None = None


class NormalizeRequest(BaseModel):
    entry_type: Literal["skill", "interest", "role", "sector", "field_of_study", "degree"]
    text: str

    @field_validator("text")
    @classmethod
    def clean(cls, v: str) -> str:
        return clean_free_text(v)


class NormalizeResponse(BaseModel):
    mapped: bool                      # True: use `entry`. False: sent for admin review.
    method: str                       # exact | fuzzy | suggest | none
    entry: TaxonomyItem | None = None
    suggestion: TaxonomyItem | None = None
    flagged: bool = False
