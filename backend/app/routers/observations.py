import os
import uuid
import shutil
import hashlib
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
from app.services.road_photo_validation import validate_road_photo

router = APIRouter(prefix="/observations", tags=["Observations & Ingestion"])

# Ensure uploads directory exists
UPLOAD_DIR = Path(settings.UPLOAD_STORAGE_DIR)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
VIDEOS_DIR = UPLOAD_DIR / "videos"
VIDEOS_DIR.mkdir(parents=True, exist_ok=True)
FRAMES_DIR = UPLOAD_DIR / "extracted_frames"
FRAMES_DIR.mkdir(parents=True, exist_ok=True)

from app.services.video_processor import collector_video_processor


@router.post("/upload-video", status_code=status.HTTP_201_CREATED)
async def upload_road_video(
    file: UploadFile = File(...),
    vehicle_id: str = Form("CITIZEN-MOB"),
    latitude: float = Form(30.7398),
    longitude: float = Form(76.7827),
    sector: Optional[str] = Form(None),
    captured_at: Optional[str] = Form(None),
    report_id: Optional[str] = Form(None),
    telemetry_json: Optional[str] = Form(None)
):
    """
    Dedicated endpoint for uploading recorded road inspection videos:
    1. Saves video to persistent backend storage.
    2. Validates video footage and rejects unrelated videos.
    3. Extracts frames using OpenCV.
    4. Runs trained YOLOv8 model & computer vision for potholes and cracks.
    5. Snaps observations to Chandigarh road segments.
    6. Calculates Infrastructure Health Score (IHS) using real data.
    7. Persists video, frames, and observations in MongoDB and object storage.
    """
    if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="GPS coordinates are invalid.")

    report_id = (report_id or "").strip() or f"RPT-VID-{uuid.uuid4().hex[:8].upper()}"
    video_id = f"VID-CHD-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}"

    # Fast idempotency check
    if db_manager.is_connected and db_manager.db is not None:
        existing = await db_manager.db.observations.find_one({"report_id": report_id}, {"_id": 0})
    else:
        existing = next((o for o in mock_store.observations if o.get("report_id") == report_id), None)
    if existing:
        return {"success": True, "duplicate": True, "message": "This video report was already received.", "data": existing}

    ext = Path(file.filename or "video.webm").suffix or ".webm"
    saved_video_path = VIDEOS_DIR / f"{video_id}{ext}"

    with open(saved_video_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Check deduplication hash of video bytes
    video_sha256 = hashlib.sha256(saved_video_path.read_bytes()).hexdigest()
    dedup_key = hashlib.sha256(f"{vehicle_id}|{captured_at or ''}|{video_sha256}".encode("utf-8")).hexdigest()

    if db_manager.is_connected and db_manager.db is not None:
        duplicate = await db_manager.db.observations.find_one({"deduplication_key": dedup_key}, {"_id": 0})
    else:
        duplicate = next((o for o in mock_store.observations if o.get("deduplication_key") == dedup_key), None)
    if duplicate:
        saved_video_path.unlink(missing_ok=True)
        return {"success": True, "duplicate": True, "message": "This inspection video has already been processed.", "data": duplicate}

    # Parse telemetry points if provided
    parsed_telemetry = None
    if telemetry_json:
        try:
            import json
            parsed_telemetry = json.loads(telemetry_json)
            if not isinstance(parsed_telemetry, list):
                parsed_telemetry = [parsed_telemetry]
        except Exception:
            pass

    # Process video inspection
    result = await collector_video_processor.process_inspection_video(
        video_path=saved_video_path,
        video_id=video_id,
        report_id=report_id,
        vehicle_id=vehicle_id,
        latitude=latitude,
        longitude=longitude,
        sector=sector,
        telemetry_points=parsed_telemetry,
        captured_at=captured_at,
        base_upload_dir=VIDEOS_DIR
    )

    if not result.get("success", False):
        saved_video_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=result.get("status_code", 422),
            detail=result.get("error", "Failed to process video inspection.")
        )

    # Tag deduplication key on primary observation
    primary_obs = result["observations"][0] if result["observations"] else result["inspection_summary"]
    primary_obs["deduplication_key"] = dedup_key
    primary_obs["video_sha256"] = video_sha256

    if db_manager.is_connected and db_manager.db is not None:
        await db_manager.db.observations.update_one(
            {"observation_id": primary_obs.get("observation_id")},
            {"$set": {"deduplication_key": dedup_key, "video_sha256": video_sha256}}
        )

    return {
        "success": True,
        "duplicate": False,
        "message": "Road inspection video analyzed and logged successfully.",
        "data": primary_obs,
        "inspection_summary": result["inspection_summary"]
    }


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
    captured_at: Optional[str] = Form(None),
    report_id: Optional[str] = Form(None),
):
    """
    Accepts road camera frame or recorded road video & GPS telemetry.
    If a video is uploaded, routes transparently to OpenCV frame extraction,
    footage validation, and YOLOv8 multi-frame detection.
    If a photo is uploaded, validates road surface, runs YOLOv8 detection,
    performs GPS snapping, and persists the record.
    """
    try:
        if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="GPS coordinates are invalid.")
        report_id = (report_id or "").strip() or f"RPT-{uuid.uuid4().hex.upper()}"
        if len(report_id) > 128:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Report identifier is invalid.")

        # Check if the uploaded file is a video
        file_ext = Path(file.filename or "").suffix.lower()
        is_video = file_ext in {".mp4", ".webm", ".mov", ".avi", ".mkv"} or (file.content_type and file.content_type.lower().startswith("video/"))

        if is_video:
            return await upload_road_video(
                file=file,
                vehicle_id=vehicle_id,
                latitude=latitude,
                longitude=longitude,
                sector=sector,
                captured_at=captured_at,
                report_id=report_id
            )

        now_iso = datetime.now(timezone.utc).isoformat()
        try:
            captured_iso = datetime.fromisoformat((captured_at or now_iso).replace("Z", "+00:00")).astimezone(timezone.utc).isoformat()
        except ValueError:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Capture timestamp is invalid.")

        # Fast idempotency check avoids writing a second image or rerunning YOLO.
        if db_manager.is_connected and db_manager.db is not None:
            existing = await db_manager.db.observations.find_one({"report_id": report_id}, {"_id": 0})
        else:
            existing = next((o for o in mock_store.observations if o.get("report_id") == report_id), None)
        if existing:
            return {"success": True, "duplicate": True, "message": "This report was already received.", "data": existing}

        obs_id = f"OBS-CHD-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}"
        saved_filename = f"{obs_id}{file_ext or '.jpg'}"
        saved_file_path = UPLOAD_DIR / saved_filename
        annotated_filename = f"annotated_{obs_id}.jpg"
        annotated_file_path = UPLOAD_DIR / annotated_filename

        with open(saved_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        accepted, validation_error = validate_road_photo(saved_file_path, file.content_type, file.filename)
        if not accepted:
            saved_file_path.unlink(missing_ok=True)
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=validation_error)

        image_sha256 = hashlib.sha256(saved_file_path.read_bytes()).hexdigest()
        deduplication_key = hashlib.sha256(
            f"{vehicle_id}|{captured_at or ''}|{image_sha256}".encode("utf-8")
        ).hexdigest()
        if db_manager.is_connected and db_manager.db is not None:
            duplicate = await db_manager.db.observations.find_one({"deduplication_key": deduplication_key}, {"_id": 0})
        else:
            duplicate = next((o for o in mock_store.observations if o.get("deduplication_key") == deduplication_key), None)
        if duplicate:
            saved_file_path.unlink(missing_ok=True)
            return {"success": True, "duplicate": True, "message": "This photo has already been reported.", "data": duplicate}

        image_url = f"/uploads/{saved_filename}"
        annotated_image_url = f"/uploads/{annotated_filename}"

        # 1. Run AI detection and generate annotated bounding box image
        raw_detections = ai_bridge.detect_road_damage(
            str(saved_file_path),
            annotate_output_path=str(annotated_file_path),
            allow_fallback=True
        )
        if not raw_detections:
            annotated_file_path.unlink(missing_ok=True)
            saved_file_path.unlink(missing_ok=True)
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="This image could not be validated as a road photo. Please capture the road surface again."
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

        # 3. Create observation record
        observation_record = {
            "observation_id": obs_id,
            "report_id": report_id,
            "report_status": "accepted",
            "report_source": "citizen" if vehicle_id.startswith("MOB-") or vehicle_id.startswith("CITIZEN-") else "survey",
            "road_photo_validated": True,
            "road_validation_engine": "YOLO road-damage detector",
            "deduplication_key": deduplication_key,
            "image_sha256": image_sha256,
            "vehicle_id": vehicle_id,
            "location": {"type": "Point", "coordinates": [longitude, latitude]},
            "latitude": latitude,
            "longitude": longitude,
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
            "captured_at": captured_iso,
            "created_at": now_iso,
            "data_label": "[LIVE CITIZEN INSPECTION]"
        }

        # 4. Store in MongoDB or in-memory store
        if db_manager.is_connected and db_manager.db is not None:
            try:
                await db_manager.db.observations.insert_one(observation_record)
            except Exception as exc:
                # A concurrent retry can win the unique index race.
                existing = await db_manager.db.observations.find_one(
                    {"$or": [{"report_id": report_id}, {"deduplication_key": deduplication_key}]}, {"_id": 0}
                )
                if existing:
                    saved_file_path.unlink(missing_ok=True)
                    return {"success": True, "duplicate": True, "message": "This report was already received.", "data": existing}
                raise exc
            if linked_segment_id:
                # Increment hazard count on the matched segment
                await db_manager.db.road_segments.update_one(
                    {"segment_id": linked_segment_id},
                    {"$inc": {"hazard_count": len(parsed_detections)}}
                )
        else:
            mock_store.observations.insert(0, observation_record)
            mock_store.report_ids.add(report_id)
            mock_store.deduplication_keys.add(deduplication_key)
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

    except HTTPException:
        raise
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
