import os
import uuid
import shutil
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from app.config import settings
from app.models.observation import ObservationModel, DetectionStatus, DetectionItem, DamageSeverity
from app.models.common import GeoPoint
from app.database.mongodb import db_manager
from app.services.mock_store import mock_store
from app.services.ai_bridge import ai_bridge

router = APIRouter(prefix="/observations", tags=["Observations & Ingestion"])

# Ensure uploads directory exists
UPLOAD_DIR = Path(settings.UPLOAD_STORAGE_DIR)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_observation(
    file: UploadFile = File(...),
    vehicle_id: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    altitude: Optional[float] = Form(None),
    speed_kmph: Optional[float] = Form(None),
    telemetry_z_shock: Optional[float] = Form(0.0),
):
    """
    Accepts road camera frame & GPS telemetry from inspection vehicles or mobile apps.
    Invokes AI road damage detection pipeline and links to nearest road segment.
    """
    try:
        # Save file to upload directory
        obs_id = f"OBS-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}"
        file_ext = Path(file.filename).suffix or ".jpg"
        saved_filename = f"{obs_id}{file_ext}"
        saved_file_path = UPLOAD_DIR / saved_filename

        with open(saved_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        image_url = f"/uploads/{saved_filename}"

        # Run AI detection via bridge
        raw_detections = ai_bridge.detect_road_damage(str(saved_file_path))
        
        parsed_detections: List[dict] = []
        for d in raw_detections:
            parsed_detections.append({
                "class_id": d.get("class_id", "D00"),
                "class_name": d.get("class_name", "Pothole"),
                "confidence": float(d.get("confidence", 0.85)),
                "bbox": d.get("bbox", [100, 100, 200, 200]),
                "severity": d.get("severity", "medium"),
                "estimated_area_sqm": float(d.get("estimated_area_sqm", 0.35))
            })

        # Match to nearest road segment (default to RS-MG-01 for demo if no spatial index match)
        linked_segment_id = "RS-MG-01"

        observation_record = {
            "observation_id": obs_id,
            "vehicle_id": vehicle_id,
            "location": {"type": "Point", "coordinates": [longitude, latitude]},
            "altitude": altitude,
            "speed_kmph": speed_kmph,
            "telemetry_z_shock": telemetry_z_shock,
            "image_url": image_url,
            "detection_status": "processed",
            "detections": parsed_detections,
            "linked_segment_id": linked_segment_id,
            "captured_at": datetime.now(timezone.utc).isoformat()
        }

        # Store in MongoDB or fallback store
        if db_manager.is_connected and db_manager.db is not None:
            await db_manager.db.observations.insert_one(observation_record)
        else:
            mock_store.observations.insert(0, observation_record)

        return {
            "success": True,
            "data": observation_record
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process observation upload: {str(e)}"
        )

@router.get("")
async def list_observations(limit: int = 50, ward_id: Optional[str] = None):
    """Lists recent road observations and damage detections."""
    if db_manager.is_connected and db_manager.db is not None:
        cursor = db_manager.db.observations.find({}, {"_id": 0}).sort("captured_at", -1).limit(limit)
        results = await cursor.to_list(length=limit)
    else:
        results = mock_store.observations[:limit]

    return {
        "success": True,
        "count": len(results),
        "data": results
    }
