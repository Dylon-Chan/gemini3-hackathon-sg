from pydantic import BaseModel, Field
from typing import Optional, Literal
from enum import Enum

PERIODS = ["1925", "1965", "1985", "present", "2040", "2070"]
PeriodLiteral = Literal["1925", "1965", "1985", "present", "2040", "2070"]


class Stage(str, Enum):
    PENDING = "pending"
    RESEARCHING = "researching"
    IMAGE_GENERATING = "image_generating"
    VIDEO_GENERATING = "video_generating"
    COMPLETE = "complete"
    ERROR = "error"


class Coordinates(BaseModel):
    lat: float
    lng: float


class LocationAnalysis(BaseModel):
    location_name: str
    coordinates: Coordinates
    confidence: float = Field(ge=0.0, le=1.0)
    neighborhood: str
    landmark_type: str
    notable_features: list[str]
    description: str


class ResearchResult(BaseModel):
    period: str
    summary: str
    key_visual_facts: list[str]
    atmosphere: str
    architectural_style: str
    street_level_details: str
    sources_used: list[str] = []


class PeriodState(BaseModel):
    period: str
    stage: Stage = Stage.PENDING
    research_summary: Optional[str] = None
    key_visual_facts: Optional[list[str]] = None
    reference_image_url: Optional[str] = None
    video_url: Optional[str] = None
    video_prompt: Optional[str] = None
    error_message: Optional[str] = None


class SessionState(BaseModel):
    session_id: str
    image_path: str
    original_image_url: str
    status: str = "uploaded"
    location: Optional[LocationAnalysis] = None
    periods: dict[str, PeriodState] = Field(default_factory=dict)

    model_config = {"arbitrary_types_allowed": True}
