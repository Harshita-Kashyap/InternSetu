from pydantic import BaseModel


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
    skill_gap: SkillGap
    apply_url: str                # official PMIS portal; InternSetu never applies for the user
    is_demo_data: bool


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
    nearest: list[NearestItem]    # only filled when nothing is eligible


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
