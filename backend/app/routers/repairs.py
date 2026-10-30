import shutil
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from app.config import settings
from app.database.mongodb import db_manager
from app.services.mock_store import mock_store
from app.services.ai_bridge import ai_bridge

router = APIRouter(prefix="/repairs", tags=["Repair Verification"])

UPLOAD_DIR = Path(settings.UPLOAD_STORAGE_DIR)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

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

