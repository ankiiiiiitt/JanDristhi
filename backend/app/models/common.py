from typing import List, Optional, Any, Generic, TypeVar
from pydantic import BaseModel, Field
from datetime import datetime, timezone

T = TypeVar("T")

class GeoPoint(BaseModel):
    type: str = "Point"
    coordinates: List[float] = Field(..., description="[longitude, latitude]")

class GeoLineString(BaseModel):
    type: str = "LineString"
    coordinates: List[List[float]] = Field(..., description="Array of [longitude, latitude] points")

class GeoJSONFeature(BaseModel):
    type: str = "Feature"
    properties: dict
    geometry: Any

class GeoJSONFeatureCollection(BaseModel):
    type: str = "FeatureCollection"
    features: List[GeoJSONFeature]

class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[dict] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class APIResponse(BaseModel, Generic[T]):
    success: bool = True
    data: Optional[T] = None
    message: Optional[str] = None
    error: Optional[ErrorDetail] = None
