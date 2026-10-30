import shutil
from pathlib import Path
from datetime import datetime, timezone
import uuid
import shutil
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from app.config import settings
from app.database.mongodb import db_manager
from app.services.mock_store import mock_store
from app.services.ai_bridge import ai_bridge

router = APIRouter(prefix="/repairs", tags=["Repair Verification"])

UPLOAD_DIR = Path(settings.UPLOAD_STORAGE_DIR)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


class CreateRepairTaskRequest(BaseModel):
    segment_id: str
    observation_id: Optional[str] = None
    hazard_type: Optional[str] = "Pothole Emergency Repair"
    priority: Optional[str] = "critical"  # critical, high, medium, low
    contractor_name: Optional[str] = "Chandigarh Municipal Works Division"
    estimated_cost_inr: Optional[float] = 45000.0
    before_image_url: Optional[str] = None
    notes: Optional[str] = None
    due_date: Optional[str] = None


class UpdateRepairTaskRequest(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    contractor_name: Optional[str] = None
    notes: Optional[str] = None
    estimated_cost_inr: Optional[float] = None


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_repair_task(request: CreateRepairTaskRequest):
    """
    Creates a new municipal repair task / work order from detected road defects.
    Allows engineers & developers to prioritize roads and assign repair teams.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    repair_id = f"REP-CHD-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"

    # Lookup linked observation if provided
    obs = None
    before_image = request.before_image_url
    road_name = "Chandigarh Municipal Sector Road"
    sector_name = "Sector 17"

    if request.observation_id:
        if db_manager.is_connected and db_manager.db is not None:
            obs = await db_manager.db.observations.find_one({"observation_id": request.observation_id}, {"_id": 0})
        else:
            obs = next((o for o in mock_store.observations if o.get("observation_id") == request.observation_id), None)

        if obs:
            if not before_image:
                before_image = obs.get("annotated_image_url") or obs.get("image_url")
            road_name = obs.get("matched_road_name") or road_name
            sector_name = obs.get("sector") or sector_name

    # Lookup road segment metadata
    if db_manager.is_connected and db_manager.db is not None:
        seg = await db_manager.db.road_segments.find_one({"segment_id": request.segment_id}, {"_id": 0})
    else:
        seg = next((s for s in mock_store.road_segments if s.get("segment_id") == request.segment_id), None)

    if seg:
        road_name = seg.get("name") or road_name
        sector_name = seg.get("area_name") or seg.get("ward_id") or sector_name

    repair_record = {
        "repair_id": repair_id,
        "observation_id": request.observation_id,
        "segment_id": request.segment_id,
        "road_name": road_name,
        "sector": sector_name,
        "hazard_type": request.hazard_type or "Pothole Repair",
        "priority": request.priority or "critical",
        "contractor_name": request.contractor_name or "Chandigarh Municipal Works Division",
        "status": "work_order_issued",
        "before_image_url": before_image or "/images/roads/road_pothole_d00.jpg",
        "after_image_url": None,
        "ai_verification_score": None,
        "damage_cleared": None,
        "estimated_cost_inr": request.estimated_cost_inr or 45000.0,
        "notes": request.notes or f"Municipal road repair order generated for {road_name}.",
        "due_date": request.due_date,
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    # Persist in MongoDB or mock_store
    if db_manager.is_connected and db_manager.db is not None:
        await db_manager.db.repair_records.insert_one(repair_record)
        if request.observation_id:
            await db_manager.db.observations.update_one(
                {"observation_id": request.observation_id},
                {"$set": {"repair_status": "work_order_issued", "linked_repair_id": repair_id}}
            )
    else:
        if not hasattr(mock_store, "repair_records"):
            mock_store.repair_records = []
        mock_store.repair_records.insert(0, repair_record)
        if request.observation_id:
            for o in mock_store.observations:
                if o.get("observation_id") == request.observation_id:
                    o["repair_status"] = "work_order_issued"
                    o["linked_repair_id"] = repair_id
                    break

    if "_id" in repair_record:
        repair_record["_id"] = str(repair_record["_id"])

    return {
        "success": True,
        "message": f"Repair work order '{repair_id}' issued successfully.",
        "data": repair_record
    }


@router.get("/{repair_id}")
async def get_repair_record(repair_id: str):
    """Retrieves a single repair record by repair_id."""
    repair = None
    if db_manager.is_connected and db_manager.db is not None:
        repair = await db_manager.db.repair_records.find_one({"repair_id": repair_id}, {"_id": 0})
    else:
        repair = next((r for r in getattr(mock_store, "repair_records", []) if r.get("repair_id") == repair_id), None)

    if not repair:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Repair record '{repair_id}' does not exist."
        )

    return {"success": True, "data": repair}


@router.put("/{repair_id}")
async def update_repair_record(repair_id: str, request: UpdateRepairTaskRequest):
    """Updates status, priority, or contractor notes on a repair task."""
    updates: Dict[str, Any] = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if request.status is not None:
        updates["status"] = request.status
    if request.priority is not None:
        updates["priority"] = request.priority
    if request.contractor_name is not None:
        updates["contractor_name"] = request.contractor_name
    if request.notes is not None:
        updates["notes"] = request.notes
    if request.estimated_cost_inr is not None:
        updates["estimated_cost_inr"] = request.estimated_cost_inr

    if db_manager.is_connected and db_manager.db is not None:
        res = await db_manager.db.repair_records.update_one({"repair_id": repair_id}, {"$set": updates})
        if res.matched_count == 0:
            raise HTTPException(status_code=404, detail=f"Repair '{repair_id}' not found.")
        repair = await db_manager.db.repair_records.find_one({"repair_id": repair_id}, {"_id": 0})
    else:
        repair = next((r for r in getattr(mock_store, "repair_records", []) if r.get("repair_id") == repair_id), None)
        if not repair:
            raise HTTPException(status_code=404, detail=f"Repair '{repair_id}' not found.")
        repair.update(updates)

    return {"success": True, "data": repair}


@router.get("")
async def list_repairs(
    status: Optional[str] = None,
    sector: Optional[str] = None,
    limit: int = 100
):
    """
    Returns active repair records, work orders, and audit statuses.
    Optimized with compound indexes on (status, created_at) and (sector, created_at).
    """
    if db_manager.is_connected and db_manager.db is not None:
        query = {}
        if status:
            query["status"] = status
        if sector:
            query["sector"] = sector
        cursor = db_manager.db.repair_records.find(query, {"_id": 0}).sort("created_at", -1).limit(limit)
        records = await cursor.to_list(length=limit)
    else:
        records = mock_store.repair_records
        if status:
            records = [r for r in records if r.get("status") == status]
        if sector:
            records = [r for r in records if r.get("sector") == sector]
        records = sorted(records, key=lambda r: r.get("created_at", ""), reverse=True)[:limit]

    return {
        "success": True,
        "count": len(records),
        "data": records
    }

@router.post("/verify/{repair_id}")
async def verify_repair_work(repair_id: str, after_file: UploadFile = File(...)):
    """
    Contractor uploads post-repair photo. AI verifies whether previously detected
    road damage is rectified. Updates status to 'verified_closed'.
    """
    # Find existing repair record
    repair = None
    if db_manager.is_connected and db_manager.db is not None:
        repair = await db_manager.db.repair_records.find_one({"repair_id": repair_id})
    else:
        repair = next((r for r in mock_store.repair_records if r["repair_id"] == repair_id), None)

    if not repair:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Repair record '{repair_id}' does not exist."
        )

    # Save uploaded after image
    file_ext = Path(after_file.filename).suffix or ".jpg"
    after_filename = f"repair_after_{repair_id}{file_ext}"
    after_path = UPLOAD_DIR / after_filename

    with open(after_path, "wb") as buffer:
        shutil.copyfileobj(after_file.file, buffer)

    # Run AI verification
    verification = ai_bridge.verify_repair(repair.get("before_image_url", ""), str(after_path))

    updates = {
        "after_image_url": f"/uploads/{after_filename}",
        "status": "verified_closed" if verification["damage_cleared"] else "rejected",
        "ai_verification_score": verification["ai_verification_score"],
        "damage_cleared": verification["damage_cleared"],
        "verified_by_user_id": "AI_AUTO_AUDITOR",
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    if db_manager.is_connected and db_manager.db is not None:
        await db_manager.db.repair_records.update_one({"repair_id": repair_id}, {"$set": updates})
        if updates["damage_cleared"]:
            # Improve linked road segment health
            seg_id = repair.get("segment_id")
            if seg_id:
                await db_manager.db.road_segments.update_one(
                    {"segment_id": seg_id},
                    {"$inc": {"health_score": 10.0, "hazard_count": -1}}
                )
    else:
        repair.update(updates)
        if updates["damage_cleared"]:
            seg_id = repair.get("segment_id")
            if seg_id:
                for s in mock_store.road_segments:
                    if s["segment_id"] == seg_id:
                        s["health_score"] = min(98.0, s.get("health_score", 60.0) + 12.0)
                        s["hazard_count"] = max(0, s.get("hazard_count", 1) - 1)
                        if s["health_score"] >= 75.0:
                            s["status_category"] = "good"
                        elif s["health_score"] >= 50.0:
                            s["status_category"] = "fair"

    return {
        "success": True,
        "data": {
            "repair_id": repair_id,
            "status": updates["status"],
            "ai_verification_score": updates["ai_verification_score"],
            "damage_cleared": updates["damage_cleared"],
            "message": verification["message"]
        }
    }

