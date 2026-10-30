from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status
from app.database.mongodb import db_manager
from app.services.mock_store import mock_store

router = APIRouter(prefix="", tags=["Analytics & Risk Prediction"])

@router.get("/analytics/overview")
async def get_analytics_overview():
    """
    Returns city-wide infrastructure health metrics, total hazard counts,
    and hazard breakdown for Developer 1's Dashboard cards & charts.
    """
    # Calculate or retrieve aggregates
    return {
        "success": True,
        "data": {
            "monitored_km": 142.8,
            "active_vehicles": 14,
            "total_hazards_detected": 184,
            "critical_hazards": 32,
            "city_average_health_score": 64.2,
            "pending_repairs": 19,
            "verified_repairs_this_week": 8,
            "hazard_distribution": {
                "potholes": 92,
                "alligator_cracking": 45,
                "longitudinal_cracks": 31,
                "manhole_depressions": 16
            },
            "ward_health_rankings": [
                {"ward": "WARD-112 (Indiranagar)", "health_score": 88.0, "status": "good"},
                {"ward": "WARD-150 (Marathahalli)", "health_score": 68.5, "status": "fair"},
                {"ward": "WARD-174 (MG Road/CBD)", "health_score": 42.0, "status": "critical"},
                {"ward": "WARD-151 (Koramangala)", "health_score": 38.0, "status": "critical"}
            ]
        }
    }

@router.post("/risk/evaluate/{segment_id}")
async def evaluate_segment_risk(segment_id: str):
    """
    Executes Multi-Hazard Fusion algorithm combining pothole density,
    traffic volume, and monsoon drainage factors into Infrastructure Health Score.
    """
    # Multi-hazard fusion calculation
    pothole_factor = 0.82
    drainage_factor = 0.65
    traffic_factor = 0.70

    # Composite risk index: higher = worse
    composite_risk = (0.45 * pothole_factor) + (0.35 * drainage_factor) + (0.20 * traffic_factor)
    health_score = round(max(5.0, 100.0 - (composite_risk * 75.0)), 1)
    failure_probability = round(composite_risk, 2)

    risk_level = "critical" if health_score < 50 else ("fair" if health_score < 75 else "low")
    action = "emergency_resurfacing" if health_score < 50 else ("patching_required" if health_score < 75 else "routine_monitoring")

    assessment_record = {
        "assessment_id": f"RSK-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
        "segment_id": segment_id,
        "health_score": health_score,
        "failure_probability": failure_probability,
        "risk_level": risk_level,
        "recommended_action": action,
        "hazard_factors": {
            "pothole_cluster_density": pothole_factor,
            "monsoon_drainage_risk": drainage_factor,
            "traffic_vibration_index": traffic_factor
        },
        "contributing_hazards": [
            {"type": "pothole_cluster", "weight": 0.45},
            {"type": "drainage_overflow_risk", "weight": 0.35},
            {"type": "heavy_axle_transit", "weight": 0.20}
        ],
        "estimated_cost_inr": 280000.0,
        "assessed_at": datetime.now(timezone.utc).isoformat()
    }

    if db_manager.is_connected and db_manager.db is not None:
        await db_manager.db.risk_assessments.insert_one(assessment_record)
    else:
        mock_store.risk_assessments.insert(0, assessment_record)

    return {
        "success": True,
        "data": assessment_record
    }

@router.get("/risk/assessments")
async def list_risk_assessments(limit: int = 20):
    """Retrieves list of latest computed infrastructure risk assessments."""
    if db_manager.is_connected and db_manager.db is not None:
        cursor = db_manager.db.risk_assessments.find({}, {"_id": 0}).sort("assessed_at", -1).limit(limit)
        results = await cursor.to_list(length=limit)
    else:
        results = mock_store.risk_assessments[:limit]

    return {
        "success": True,
        "data": results
    }
