"""
Road Condition ML Prediction Router
===================================
Exposes the trained Pavement Condition Index (PCI) ML model via FastAPI.
Enforces explicit foreign-region data provenance (Ontario, Canada) and
ensures predictions are never represented as actual Chandigarh survey data.
"""

from typing import Optional, Dict, Any
from fastapi import APIRouter, Body, status
from pydantic import BaseModel, Field
from app.services.road_condition_service import road_condition_service

router = APIRouter(prefix="/road-condition", tags=["Road Condition ML & Analytics"])


class RoadConditionPredictRequest(BaseModel):
    dmi: Optional[float] = Field(None, ge=1.0, le=10.0, description="Distress Manifestation Index (1.0 to 10.0, where 10 is pristine)")
    iri: Optional[float] = Field(None, ge=0.0, le=15.0, description="International Roughness Index in m/km")
    telemetry_z_shock: Optional[float] = Field(None, ge=0.0, le=15.0, description="Mobile accelerometer Z-shock in m/s^2 (used to estimate IRI if omitted)")
    potholes_count: Optional[int] = Field(0, ge=0, description="Count of detected potholes (used to estimate DMI if omitted)")
    cracks_count: Optional[int] = Field(0, ge=0, description="Count of detected cracks (used to estimate DMI if omitted)")
    pave_type: Optional[str] = Field("AC", description="Pavement material: AC (Asphalt), ST (Surface Treated), CO (Composite), PC (Concrete)")
    func_class: Optional[str] = Field("ART", description="Functional classification: FWY (Freeway), ART (Arterial), COL (Collector), LOC (Local)")
    segment_length_km: Optional[float] = Field(1.0, ge=0.05, le=100.0, description="Road segment length in kilometers")


@router.post("/predict", status_code=status.HTTP_200_OK)
async def predict_road_condition(req: RoadConditionPredictRequest = Body(...)):
    """
    Predicts the Pavement Condition Index (PCI 0-100) and condition category
    using the trained Ontario reference ML pipeline.

    - If direct `dmi` and `iri` are provided, uses them directly.
    - If `telemetry_z_shock` or defect counts are provided, converts them to estimated DMI and IRI.
    - All responses clearly identify the foreign dataset origin (Ontario MTO, Canada)
      and explicitly specify `is_chandigarh_local_data: false`.
    """
    if req.dmi is not None and req.iri is not None:
        prediction = road_condition_service.predict(
            dmi=req.dmi,
            iri=req.iri,
            segment_length_km=req.segment_length_km or 1.0,
            pave_type=req.pave_type or "AC",
            func_class=req.func_class or "ART"
        )
    else:
        prediction = road_condition_service.predict_from_telemetry(
            telemetry_z_shock=req.telemetry_z_shock,
            potholes_count=req.potholes_count or 0,
            cracks_count=req.cracks_count or 0,
            pave_type=req.pave_type or "AC",
            func_class=req.func_class or "ART"
        )

    return {
        "success": True,
        "data": prediction
    }


@router.get("/metadata", status_code=status.HTTP_200_OK)
async def get_road_condition_metadata():
    """
    Returns the road condition model evaluation metrics, comparison between
    OpenDataNI and Ontario datasets, and strict foreign data provenance disclosures.
    """
    meta = road_condition_service.get_metadata()
    return {
        "success": True,
        "data": meta
    }

