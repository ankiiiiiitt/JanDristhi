from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class CollectorTelemetryPoint(BaseModel):
    timestamp: str = Field(..., description="ISO 8601 UTC timestamp")
    video_time_ms: int = Field(..., description="Offset in milliseconds from video recording start")
    latitude: float = Field(..., description="GPS Latitude")
    longitude: float = Field(..., description="GPS Longitude")
    altitude: Optional[float] = Field(None, description="GPS Altitude in meters")
    accuracy_m: Optional[float] = Field(None, description="GPS Horizontal Accuracy in meters")
    speed_kmph: Optional[float] = Field(None, description="Speed in km/h")
    heading: Optional[float] = Field(None, description="Heading degrees")
    raw_accel: Dict[str, float] = Field(
        default_factory=dict,
        description="Raw phone triaxial accelerometer readings (x, y, z in m/s^2)"
    )
    calibrated_z_shock: float = Field(
        default=0.0,
        description="Calibrated dynamic vertical bump shock (m/s^2) relative to calibrated mount orientation"
    )
    dynamic_magnitude: float = Field(
        default=0.0,
        description="Magnitude of dynamic acceleration vector |a - g|"
    )
    sensor_source: str = Field(
        default="PHONE_IMU_SMARTPHONE",
        description="Sensor origin label: PHONE_IMU_SMARTPHONE vs VEHICLE_CAN_MPU6050"
    )
    is_calibrated: bool = Field(
        default=False,
        description="Whether sensor orientation calibration step was performed"
    )

class CollectorSessionRecord(BaseModel):
    session_id: str = Field(..., description="Unique collector session identifier")
    vehicle_id: str = Field(default="PHONE-COLLECTOR-01", description="Vehicle ID")
    operator_name: Optional[str] = Field("Android Chrome Collector", description="Operator / device description")
    device_model: Optional[str] = Field("Android Chrome / Mobile", description="User Agent / Device identifier")
    mount_type: Optional[str] = Field("windshield_mount", description="Phone mount position")
    started_at: str = Field(..., description="Recording start timestamp")
    ended_at: str = Field(..., description="Recording end timestamp")
    duration_seconds: float = Field(..., description="Total duration of recording in seconds")
    video_url: Optional[str] = Field(None, description="Path or URL to saved video file")
    telemetry_count: int = Field(default=0, description="Number of synchronized telemetry packets recorded")
    frames_processed: int = Field(default=0, description="Number of video frames analyzed by AI")
    hazards_detected: int = Field(default=0, description="Number of road hazards identified")
    created_observations: List[str] = Field(default_factory=list, description="IDs of created observations")
    max_vertical_shock: float = Field(default=0.0, description="Peak calibrated vertical shock recorded (m/s^2)")
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

