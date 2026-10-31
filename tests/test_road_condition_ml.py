"""
Unit and Integration Test Suite: Road Condition ML Model & FastAPI Integration
==============================================================================
Validates:
1. ML model prediction accuracy, consistency, and bounds (PCI 0-100).
2. Unseen test data evaluation metrics from Ontario training (R^2 > 0.90, MAE < 2.0).
3. Explicit foreign-region data provenance (Ontario, Canada) and strict prevention
   of presenting foreign benchmark data as native Chandigarh survey data.
4. FastAPI endpoints: POST /api/v1/road-condition/predict & GET /api/v1/road-condition/metadata.
5. Telemetry-to-condition inference integration (accelerometer shock + visual defects).
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from road_condition_predictor import road_condition_predictor
from app.services.road_condition_service import road_condition_service, DATASET_COMPARISON

client = TestClient(app)


def test_road_condition_model_loaded_and_predicts():
    """
    Verifies that the trained ML pipeline is loaded and produces valid predictions.
    """
    assert road_condition_predictor.pipeline is not None, "Model pipeline should be loaded"

    # Pristine highway condition (High DMI, Low IRI)
    result_good = road_condition_predictor.predict(
        dmi=9.5,
        iri=0.9,
        segment_length_km=2.5,
        pave_type="AC",
        func_class="FWY"
    )

    assert 80.0 <= result_good["predicted_pci"] <= 100.0
    assert result_good["condition_rating"] in ["Good", "Satisfactory"]
    assert result_good["severity"] in ["low", "medium"]

    # Severe deterioration condition (Low DMI, High IRI)
    result_poor = road_condition_predictor.predict(
        dmi=4.2,
        iri=4.8,
        segment_length_km=1.0,
        pave_type="ST",
        func_class="LOC"
    )

    assert result_poor["predicted_pci"] < 55.0
    assert result_poor["condition_rating"] in ["Poor", "Critical Failure"]
    assert result_poor["severity"] == "critical"


def test_evaluation_metrics_on_unseen_test_data():
    """
    Verifies that model metadata contains documented evaluation metrics
    on the held-out 20% unseen test split.
    """
    meta = road_condition_predictor.metadata
    assert "evaluation_metrics_unseen_test" in meta
    test_metrics = meta["evaluation_metrics_unseen_test"]

    assert test_metrics["R2_Score"] >= 0.90, f"R^2 must exceed 0.90, got {test_metrics['R2_Score']}"
    assert test_metrics["MAE"] <= 2.5, f"MAE must be <= 2.5, got {test_metrics['MAE']}"
    assert test_metrics["RMSE"] <= 4.0, f"RMSE must be <= 4.0, got {test_metrics['RMSE']}"
    assert meta["test_samples"] > 0
    assert meta["training_samples"] > 0


def test_foreign_data_identification_and_no_chandigarh_claim():
    """
    CRITICAL POLICY TEST:
    Foreign-region data (Ontario, Canada) must be clearly identified
    and NEVER presented as actual Chandigarh road data.
    """
    # 1. Direct predictor output check
    pred = road_condition_predictor.predict(dmi=8.0, iri=1.5)
    provenance = pred["data_provenance"]

    assert provenance["is_chandigarh_local_data"] is False
    assert "Ontario" in provenance["source_dataset"]
    assert "Canada" in provenance["regional_context"]
    assert "never presented as native Chandigarh" in provenance["regional_disclaimer"]

    # 2. Service metadata check
    meta = road_condition_service.get_metadata()
    disclosure = meta["foreign_region_disclosure"]
    assert disclosure["is_chandigarh_local_data"] is False
    assert disclosure["training_region"] == "Ontario, Canada"
    assert "NEVER be represented as actual Chandigarh" in disclosure["policy"]


def test_fastapi_predict_endpoint_with_direct_dmi_iri():
    """
    Tests POST /api/v1/road-condition/predict using direct engineering metrics.
    """
    payload = {
        "dmi": 8.8,
        "iri": 1.2,
        "segment_length_km": 1.5,
        "pave_type": "AC",
        "func_class": "ART"
    }

    res = client.post("/api/v1/road-condition/predict", json=payload)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["success"] is True

    data = body["data"]
    assert "predicted_pci" in data
    assert 0.0 <= data["predicted_pci"] <= 100.0
    assert "condition_rating" in data
    assert "recommended_action" in data
    assert data["data_provenance"]["is_chandigarh_local_data"] is False


def test_fastapi_predict_endpoint_with_telemetry_inputs():
    """
    Tests POST /api/v1/road-condition/predict using JanDrishti mobile telemetry
    (accelerometer shock + detected defects).
    """
    payload = {
        "telemetry_z_shock": 4.5,
        "potholes_count": 3,
        "cracks_count": 4,
        "pave_type": "AC",
        "func_class": "ART"
    }

    res = client.post("/api/v1/road-condition/predict", json=payload)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["success"] is True

    data = body["data"]
    assert "predicted_pci" in data
    assert "telemetry_inputs" in data
    assert data["telemetry_inputs"]["telemetry_z_shock"] == 4.5
    assert data["telemetry_inputs"]["potholes_count"] == 3
    # With 3 potholes and high shock, PCI should reflect degraded condition
    assert data["predicted_pci"] < 80.0
    assert data["data_provenance"]["is_chandigarh_local_data"] is False


def test_fastapi_metadata_endpoint_dataset_comparison():
    """
    Tests GET /api/v1/road-condition/metadata and verifies dataset comparison.
    """
    res = client.get("/api/v1/road-condition/metadata")
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["success"] is True

    comparison = body["data"]["dataset_comparison"]
    assert "opendatani" in comparison
    assert "ontario_mto" in comparison

    assert comparison["opendatani"]["selected_for_pci_model"] is False
    assert comparison["ontario_mto"]["selected_for_pci_model"] is True

    assert "Northern Ireland" in comparison["opendatani"]["jurisdiction"]
    assert "Ontario, Canada" in comparison["ontario_mto"]["jurisdiction"]

    assert body["data"]["foreign_region_disclosure"]["is_chandigarh_local_data"] is False


def test_pci_bounds_and_input_clamping():
    """
    Verifies that extreme inputs are safely clamped within realistic physical bounds.
    """
    # Negative IRI / Out-of-bounds DMI
    res_clamped = road_condition_predictor.predict(dmi=15.0, iri=-5.0, segment_length_km=-1.0)
    assert 0.0 <= res_clamped["predicted_pci"] <= 100.0
    assert res_clamped["inputs_used"]["dmi_distress"] == 10.0
    assert res_clamped["inputs_used"]["iri_roughness"] == 0.0
    assert res_clamped["inputs_used"]["segment_length_km"] >= 0.05

