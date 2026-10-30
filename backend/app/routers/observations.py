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
from app.services.gps_snapping import snap_gps_to_road_segment

router = APIRouter(prefix="/observations", tags=["Observations & Ingestion"])

# Ensure uploads directory exists
UPLOAD_DIR = Path(settings.UPLOAD_STORAGE_DIR)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_observation(
    file: UploadFile = File(...),
    vehicle_id: str = Form("CTU-BUS-104"),
    latitude: float = Form(30.7398),
    longitude: float = Form(76.7827),
    sector: Optional[str] = Form(None),
    altitude: Optional[float] = Form(None),
    speed_kmph: Optional[float] = Form(None),
    telemetry_z_shock: Optional[float] = Form(0.0),
):
    """
    Accepts road camera frame & GPS telemetry from inspection vehicles or mobile apps.
    Runs YOLOv8/RDD2022 road damage detection, performs GPS snapping to the nearest
    Chandigarh road segment, generates an annotated image, and persists the record.
    """
    try:
        obs_id = f"OBS-CHD-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}"
        file_ext = Path(file.filename).suffix or ".jpg"
        saved_filename = f"{obs_id}{file_ext}"
        saved_file_path = UPLOAD_DIR / saved_filename
        annotated_filename = f"annotated_{obs_id}.jpg"
        annotated_file_path = UPLOAD_DIR / annotated_filename

        with open(saved_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        image_url = f"/uploads/{saved_filename}"
        annotated_image_url = f"/uploads/{annotated_filename}"

        # 1. Run AI detection and generate annotated bounding box image
        raw_detections = ai_bridge.detect_road_damage(
            str(saved_file_path),
            annotate_output_path=str(annotated_file_path)
        )

        parsed_detections: List[dict] = []
        for d in raw_detections:
            parsed_detections.append({
                "class_id": d.get("class_id", "D00"),
                "class_name": d.get("class_name", "Potholes"),
                "confidence": float(d.get("confidence", 0.88)),
                "bbox": d.get("bbox", [100, 100, 250, 250]),
                "severity": d.get("severity", "medium"),
                "estimated_area_sqm": float(d.get("estimated_area_sqm", 0.40)),
                "engine": d.get("engine", "RDD2022")
            })

        # 2. GPS Snapping to nearest Chandigarh road segment
        segments = []
        if db_manager.is_connected and db_manager.db is not None:
            cursor = db_manager.db.road_segments.find({}, {"_id": 0})
            segments = await cursor.to_list(length=300)
        else:
            segments = mock_store.road_segments

        snap_result = snap_gps_to_road_segment(latitude, longitude, segments, max_threshold_meters=150.0)
        is_matched = snap_result.get("matched", False)
        if is_matched:
            linked_segment_id = snap_result.get("segment_id")
            matched_road_name = snap_result.get("segment_name") or "Urban Road Segment"
            matched_sector = snap_result.get("sector") or sector or "Chandigarh"
            snapping_distance = snap_result.get("distance_meters")
        else:
            linked_segment_id = snap_result.get("segment_id")
            matched_sector = sector or snap_result.get("sector") or "Field Location"
            matched_road_name = f"{matched_sector} (Live GPS Report)"
            snapping_distance = snap_result.get("distance_meters")

        now_iso = datetime.now(timezone.utc).isoformat()
        # 3. Create observation record
        observation_record = {
            "observation_id": obs_id,
            "vehicle_id": vehicle_id,
            "location": {"type": "Point", "coordinates": [longitude, latitude]},
            "altitude": altitude or 340.0,
            "speed_kmph": speed_kmph or 36.0,
            "telemetry_z_shock": telemetry_z_shock or 2.5,
            "image_url": image_url,
            "annotated_image_url": annotated_image_url,
            "detection_status": "processed",
            "detections": parsed_detections,
            "linked_segment_id": linked_segment_id,
            "matched_road_name": matched_road_name,
            "sector": matched_sector,
            "snapping_distance_meters": snapping_distance,
            "captured_at": now_iso,
            "created_at": now_iso,
            "data_label": "[DEMO DATA - SIMULATED OBSERVATION]"
        }

        # 4. Store in MongoDB or in-memory store
        if db_manager.is_connected and db_manager.db is not None:
            await db_manager.db.observations.insert_one(observation_record)
            if linked_segment_id:
                # Increment hazard count on the matched segment
                await db_manager.db.road_segments.update_one(
                    {"segment_id": linked_segment_id},
                    {"$inc": {"hazard_count": len(parsed_detections)}}
                )
        else:
            mock_store.observations.insert(0, observation_record)
            if linked_segment_id:
                for s in mock_store.road_segments:
                    if s["segment_id"] == linked_segment_id:
                        s["hazard_count"] = s.get("hazard_count", 0) + len(parsed_detections)

        if "_id" in observation_record:
            observation_record["_id"] = str(observation_record["_id"])

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
async def list_observations(
    limit: int = 50,
    ward_id: Optional[str] = None,
    sector: Optional[str] = None,
    severity: Optional[str] = None,
    detection_status: Optional[str] = None,
    sort_by: str = "created_at"
):
    """
    Lists recent road observations and damage detections in Chandigarh.
    Leverages compound indexes:
      - (sector, created_at)
      - (detections.severity, created_at)
      - (detection_status, created_at)
      - (sector, detection_status, created_at)
    """
    if db_manager.is_connected and db_manager.db is not None:
        query = {}
        if ward_id:
            query["ward_id"] = ward_id
        if sector:
            query["sector"] = sector
        if detection_status:
            query["detection_status"] = detection_status
        if severity:
            query["detections.severity"] = severity.lower()

        # Sort field alignment for compound indexes
        sort_field = "captured_at" if sort_by == "captured_at" else "created_at"
        cursor = db_manager.db.observations.find(query, {"_id": 0}).sort(sort_field, -1).limit(limit)
        results = await cursor.to_list(length=limit)
    else:
        results = mock_store.observations
        if ward_id:
            results = [o for o in results if o.get("ward_id") == ward_id]
        if sector:
            results = [o for o in results if o.get("sector") == sector]
        if detection_status:
            results = [o for o in results if o.get("detection_status") == detection_status]
        if severity:
            sev_lower = severity.lower()
            results = [
                o for o in results
                if any(str(d.get("severity", "")).lower() == sev_lower for d in o.get("detections", []))
            ]
        # Sort descending by created_at or captured_at
        results = sorted(
            results,
            key=lambda o: o.get("created_at") or o.get("captured_at") or "",
            reverse=True
        )[:limit]

    for item in results:
        if "created_at" not in item:
            item["created_at"] = item.get("captured_at")

    return {
        "success": True,
        "count": len(results),
        "data": results
    }
