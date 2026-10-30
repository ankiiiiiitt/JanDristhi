from typing import Optional, List
from fastapi import APIRouter, HTTPException, status
from app.database.mongodb import db_manager
from app.services.mock_store import mock_store
from app.models.road_segment import RoadSegmentModel, RoadSegmentUpdate

router = APIRouter(prefix="/roads", tags=["Road Segments & GIS"])

def get_color_for_health(health_score: float) -> str:
    if health_score >= 75.0:
        return "#10b981" # Green (Good)
    elif health_score >= 50.0:
        return "#f59e0b" # Amber (Fair)
    else:
        return "#ef4444" # Red (Critical)

@router.get("/geojson")
async def get_roads_geojson(ward_id: Optional[str] = None):
    """
    Returns standard GeoJSON FeatureCollection of road segments
    with color coding and health metadata for Leaflet rendering.
    """
    segments = []
    if db_manager.is_connected and db_manager.db is not None:
        query = {"ward_id": ward_id} if ward_id else {}
        cursor = db_manager.db.road_segments.find(query, {"_id": 0})
        segments = await cursor.to_list(length=200)
    else:
        segments = [s for s in mock_store.road_segments if not ward_id or s.get("ward_id") == ward_id]

    features = []
    for seg in segments:
        health = float(seg.get("health_score", 70.0))
        features.append({
            "type": "Feature",
            "properties": {
                "segment_id": seg["segment_id"],
                "name": seg["name"],
                "ward_id": seg.get("ward_id", "WARD-174"),
                "health_score": health,
                "status_category": seg.get("status_category", "good"),
                "hazard_count": seg.get("hazard_count", 0),
                "length_meters": seg.get("length_meters", 500.0),
                "color": get_color_for_health(health),
                "last_inspected_at": seg.get("last_inspected_at")
            },
            "geometry": seg["geometry"]
        })

    return {
        "type": "FeatureCollection",
        "features": features
    }

@router.get("/{segment_id}")
async def get_road_segment(segment_id: str):
    """Retrieves full metadata and telemetry history for a specific road segment."""
    segment = None
    if db_manager.is_connected and db_manager.db is not None:
        segment = await db_manager.db.road_segments.find_one({"segment_id": segment_id}, {"_id": 0})
    else:
        segment = next((s for s in mock_store.road_segments if s["segment_id"] == segment_id), None)

    if not segment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Road segment with ID '{segment_id}' was not found."
        )

    return {
        "success": True,
        "data": segment
    }

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_road_segment(segment: RoadSegmentModel):
    """Creates a new road segment with GeoJSON LineString coordinates."""
    seg_dict = segment.dict()
    if db_manager.is_connected and db_manager.db is not None:
        await db_manager.db.road_segments.insert_one(seg_dict)
    else:
        mock_store.road_segments.append(seg_dict)

    return {
        "success": True,
        "data": seg_dict
    }

@router.patch("/{segment_id}")
async def update_road_segment(segment_id: str, updates: RoadSegmentUpdate):
    """Updates road segment condition and hazard metrics."""
    data_to_update = {k: v for k, v in updates.dict().items() if v is not None}
    if not data_to_update:
        return {"success": True, "message": "No changes specified"}

    if db_manager.is_connected and db_manager.db is not None:
        res = await db_manager.db.road_segments.update_one(
            {"segment_id": segment_id},
            {"$set": data_to_update}
        )
        if res.matched_count == 0:
            raise HTTPException(status_code=404, detail="Segment not found")
    else:
        segment = next((s for s in mock_store.road_segments if s["segment_id"] == segment_id), None)
        if not segment:
            raise HTTPException(status_code=404, detail="Segment not found")
        segment.update(data_to_update)

    return {"success": True, "updated": data_to_update}
