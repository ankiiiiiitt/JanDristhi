from typing import List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from enum import Enum

class RiskAction(str, Enum):
    ROUTINE_MONITORING = "routine_monitoring"
    PATCHING_REQUIRED = "patching_required"
    EMERGENCY_RESURFACING = "emergency_resurfacing"

class HazardFactor(BaseModel):
    type: str
    weight: float

class RiskAssessmentModel(BaseModel):
    assessment_id: str
    segment_id: str
    health_score: float = Field(..., ge=0, le=100)
    failure_probability: float = Field(..., ge=0.0, le=1.0)
    risk_level: str
    recommended_action: RiskAction
    hazard_factors: Dict[str, float] = {}
    contributing_hazards: List[HazardFactor] = []
    estimated_cost_inr: float = 0.0
    assessed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

