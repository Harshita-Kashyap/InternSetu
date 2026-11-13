from typing import Any

from pydantic import BaseModel


class ReasonCode(BaseModel):
    code: str                     # e.g. SKILLS_MATCH, LOC_HOME (see engine/explanation/reasons.py)
    params: dict[str, Any] = {}   # values to put in the sentence (names, counts)


class RelatedSkill(BaseModel):
    missing: str
    you_have: list[str]


class SkillGap(BaseModel):
    missing_mandatory: list[str]
    missing_preferred: list[str]
    related_skills: list[RelatedSkill]
    missing_mandatory_ids: list[str]
    missing_preferred_ids: list[str]


class RecommendationItem(BaseModel):
    rank: int
    internship_id: str            # e.g. ISU-000015
    title: str
    company_name: str
    location: str                 # city id
    location_name: str
    sector_name: str
    role_name: str
    duration: str | None
    stipend_inr_per_month: int | None
    ranking_score: float          # only for ordering
    match_percentage: float       # show this one
    low_match: bool
    match_tag: str | None         # "Low match" or null
    why_recommended: list[str]
    considerations: list[str]
    why_codes: list[ReasonCode] = []        # same reasons as codes + parameters, for clients that translate themselves
    consider_codes: list[ReasonCode] = []
    skill_gap: SkillGap
    apply_url: str                # official PMIS portal; InternSetu never applies for the user
    is_demo_data: bool
    tier: str = "eligible"          # "eligible" or "near" (close match: 1-2 mandatory skills missing)
    eligible: bool = True
    tier_label: str = "Eligible"   # "Eligible", "Close match" or "Starter" (many skills still needed)
    starter: bool = False
    distance_km: int | None = None   # straight-line km from your home place (null if unknown)


class CourseLink(BaseModel):
    provider: str
    url: str


class SkillUnlock(BaseModel):
    skill_id: str
    skill: str
    unlocks: int                  # internships this ONE skill would make you eligible for
    course_links: list[CourseLink] = []   # free-course search links (SWAYAM, YouTube)


class SkillGapSummaryItem(BaseModel):
    skill_id: str
    skill: str
    count: int


class NearestItem(BaseModel):
    internship_id: str
    title: str
    company_name: str
    location_name: str
    missing_mandatory_ids: list[str]
    missing_mandatory: list[str]
    education_gap_levels: int
    reason: str
    reason_codes: list[ReasonCode] = []


class RecommendationsResponse(BaseModel):
    method: str
    k: int
    count: int
    eligible_count: int
    total_internships: int
    message: str | None
    is_demo_data: bool
    demo_notice: str | None
    disclaimer: str
    recommendations: list[RecommendationItem]
    skill_gap_summary: list[SkillGapSummaryItem]
    nearest: list[NearestItem]    # only filled when nothing at all can be shown
    skill_unlocks: list[SkillUnlock] = []
    close_count: int = 0
    only_my_sectors: bool = False   # true when the list was limited to the chosen industries
    nearby_count: int = 0           # eligible + close-match internships within ~100 km of home
    location_message: str | None = None   # set when you prefer to stay near home and few options are near


class SkillRef(BaseModel):
    id: str
    name: str


class InternshipDetail(BaseModel):
    internship_id: str
    title: str
    company_name: str
    description: str
    location: str
    location_name: str
    sector_name: str
    role_name: str
    duration: str | None
    stipend_inr_per_month: int | None
    facilities: list[str]
    distance_km: int | None = None
    education_required: str | None
    mandatory_skills: list[SkillRef]
    preferred_skills: list[SkillRef]
    apply_url: str
    is_demo_data: bool
    # how this internship fits the logged-in candidate
    eligible: bool
    match_percentage: float
    low_match: bool
    match_tag: str | None
    why_recommended: list[str]
    considerations: list[str]
    why_codes: list[ReasonCode] = []
    consider_codes: list[ReasonCode] = []
    skill_gap: SkillGap
    disclaimer: str


class SavedItem(BaseModel):
    internship_id: str
    title: str
    company_name: str
    location_name: str
    duration: str | None
    stipend_inr_per_month: int | None
    is_demo_data: bool
    saved_at: str
    eligible: bool | None = None          # null until the profile is complete
    match_percentage: float | None = None


class BrowseItem(BaseModel):
    internship_id: str
    title: str
    company_name: str
    location: str                         # city id
    location_name: str
    sector_name: str
    role_name: str
    duration: str | None
    stipend_inr_per_month: int | None
    is_demo_data: bool
    apply_url: str
    saved: bool
    eligible: bool | None = None          # null until the profile is complete
    match_percentage: float | None = None  # only for eligible internships
    low_match: bool | None = None
    missing_mandatory: list[str] = []     # why an internship is not eligible (skills)
    education_ok: bool | None = None
    distance_km: int | None = None


class BrowseResponse(BaseModel):
    total: int
    limit: int
    offset: int
    profile_complete: bool
    items: list[BrowseItem]
