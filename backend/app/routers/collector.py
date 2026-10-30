import json
import shutil
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from app.config import settings
from app.database.mongodb import db_manager
from app.services.mock_store import mock_store
from app.services.video_processor import collector_video_processor

router = APIRouter(prefix="/collector", tags=["Mobile Collector"])

COLLECTOR_UPLOAD_DIR = Path(settings.UPLOAD_STORAGE_DIR) / "collector"
COLLECTOR_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.get("/status")
async def collector_status():
    """Returns mobile collector endpoint status and readiness."""
    return {
        "status": "online",
        "supported_codecs": ["video/webm", "video/mp4"],
        "max_upload_size_mb": 50,
        "default_sensor_source": "PHONE_IMU_SMARTPHONE",
        "reference_comparison_source": "VEHICLE_CAN_MPU6050",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@router.get("/sessions")
async def list_collector_sessions():
    """Lists past mobile collector recording sessions."""
    if db_manager.is_connected and db_manager.db is not None:
        cursor = db_manager.db.collector_sessions.find({}, {"_id": 0}).sort("created_at", -1)
        sessions = await cursor.to_list(length=50)
    else:
        sessions = getattr(mock_store, "collector_sessions", [])

    return {
        "success": True,
        "count": len(sessions),
        "data": sessions
    }

@router.post("/upload-session")
async def upload_collector_session(
    video_file: Optional[UploadFile] = File(None),
    telemetry_json: str = Form(...),
    session_id: Optional[str] = Form(None),
    vehicle_id: Optional[str] = Form("MOB-PHONE-01"),
    operator_name: Optional[str] = Form("Android Chrome Collector"),
    keyframes_json: Optional[str] = Form(None)
):
    """
    Receives synchronized video and telemetry recorded on Android Chrome Mobile Collector.
    Extracts keyframes, matches GPS + phone IMU accelerometer shock, detects road damages via
    YOLOv8, snaps to Chandigarh road network, and persists to database.
    """
    if not session_id:
        session_id = f"SES-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"

    # Parse telemetry points
    try:
        telemetry_points = json.loads(telemetry_json)
        if not isinstance(telemetry_points, list):
            telemetry_points = [telemetry_points]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid telemetry_json format: {e}"
        )

    # Parse keyframes if provided
    keyframes_payload = None
    if keyframes_json:
        try:
            keyframes_payload = json.loads(keyframes_json)
        except Exception:
            pass

    # Save uploaded video
    saved_video_path = None
    if video_file:
        session_folder = COLLECTOR_UPLOAD_DIR / session_id
        session_folder.mkdir(parents=True, exist_ok=True)
        ext = Path(video_file.filename).suffix or ".webm"
        saved_video_path = session_folder / f"raw_video{ext}"
        with open(saved_video_path, "wb") as buffer:
            shutil.copyfileobj(video_file.file, buffer)

    # Process session
    result = await collector_video_processor.process_mobile_session(
        session_id=session_id,
        video_path=saved_video_path,
        telemetry_points=telemetry_points,
        vehicle_id=vehicle_id or "MOB-PHONE-01",
        operator_name=operator_name or "Android Chrome Collector",
        keyframes_payload=keyframes_payload,
        base_upload_dir=COLLECTOR_UPLOAD_DIR
    )

    if not result.get("success", False):
        if saved_video_path and saved_video_path.exists():
            saved_video_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=result.get("status_code", 422),
            detail=result.get("error", "Failed to process mobile collector session.")
        )

    return result

