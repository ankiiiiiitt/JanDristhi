from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from enum import Enum

class RepairStatus(str, Enum):
    WORK_ORDER_ISSUED = "work_order_issued"
    IN_PROGRESS = "in_progress"
    COMPLETED_UNVERIFIED = "completed_unverified"
    VERIFIED_CLOSED = "verified_closed"
    REJECTED = "rejected"

class RepairRecordModel(BaseModel):
    repair_id: str
    segment_id: str
    contractor_name: str
    status: RepairStatus = RepairStatus.WORK_ORDER_ISSUED
    before_image_url: str
    after_image_url: Optional[str] = None
    ai_verification_score: Optional[float] = None
    damage_cleared: Optional[bool] = None
    verified_by_user_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

