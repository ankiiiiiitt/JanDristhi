from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from enum import Enum
from .common import GeoPoint

class DetectionStatus(str, Enum):
    PENDING = "pending"
    PROCESSED = "processed"
    FAILED = "failed"

class DamageSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class DetectionItem(BaseModel):
    class_id: str = Field(..., description="e.g. D00 (Pothole), D10 (Alligator crack), D20, D40")
    class_name: str
    confidence: float
    bbox: List[int] = Field(..., description="[ymin, xmin, ymax, xmax] or [x, y, w, h]")
    severity: DamageSeverity = DamageSeverity.MEDIUM
    estimated_area_sqm: float = 0.0

class ObservationCreate(BaseModel):
    vehicle_id: str
    latitude: float
    longitude: float
    altitude: Optional[float] = None
    speed_kmph: Optional[float] = None
    telemetry_z_shock: Optional[float] = 0.0

class ObservationModel(BaseModel):
    observation_id: str
    vehicle_id: str
    location: GeoPoint
    altitude: Optional[float] = None
    speed_kmph: Optional[float] = None
    telemetry_z_shock: Optional[float] = 0.0
    image_url: str
    detection_status: DetectionStatus = DetectionStatus.PENDING
    detections: List[DetectionItem] = []
    linked_segment_id: Optional[str] = None
    captured_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

