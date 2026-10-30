from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from enum import Enum
from .common import GeoPoint

class VehicleType(str, Enum):
    BUS = "bus"
    WASTE_TRUCK = "waste_truck"
    INSPECTION_VAN = "inspection_van"
    PATROL_BIKE = "patrol_bike"

class VehicleStatus(str, Enum):
    ACTIVE = "active"
    IDLE = "idle"
    MAINTENANCE = "maintenance"

class VehicleModel(BaseModel):
    vehicle_id: str
    vehicle_type: VehicleType = VehicleType.INSPECTION_VAN
    operator_name: str
    status: VehicleStatus = VehicleStatus.ACTIVE
    last_known_location: GeoPoint
    last_active_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

