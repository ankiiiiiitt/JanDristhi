from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from enum import Enum
from .common import GeoLineString

class RoadConditionStatus(str, Enum):
    GOOD = "good"
    FAIR = "fair"
    CRITICAL = "critical"

class RoadSegmentModel(BaseModel):
    segment_id: str
    name: str
    ward_id: str = "WARD-174"
    geometry: GeoLineString
    length_meters: float
    health_score: float = Field(..., ge=0, le=100, description="0 (Dangerous) to 100 (Pristine)")
    status_category: RoadConditionStatus = RoadConditionStatus.GOOD
    hazard_count: int = 0
    last_inspected_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RoadSegmentUpdate(BaseModel):
    name: Optional[str] = None
    health_score: Optional[float] = None
    status_category: Optional[RoadConditionStatus] = None
    hazard_count: Optional[int] = None

