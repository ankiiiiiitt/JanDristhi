"""
Comprehensive Test Suite for JanDrishti Two-Stage Real Image Validation Pipeline.
================================================================================
Validates:
Stage 1: Road Surface Validation
         - Rejects selfies, portraits, and people-only images.
         - Rejects indoor scenes, domestic tungsten lighting, and unrelated objects.
         - Accepts genuine outdoor asphalt/concrete road surfaces.
Stage 2: Road Damage Detection
         - ONLY executed if Stage 1 passes; SKIPPED if Stage 1 fails.
         - Clean road surface is marked "No Damage Detected" (is_hazard=False, detections=[]).
         - Damaged road surface detects authentic class, confidence, bounding boxes, and severity.
Separation of Results:
         - Verification that Stage 1 and Stage 2 are independent, distinct results.
         - No fake detections or simulated fallbacks for invalid images.
"""

import io
from pathlib import Path
import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.two_stage_validator import (
    Stage1RoadSurfaceValidator,
    Stage2RoadDamageDetector,
    TwoStageRoadPipeline,
    two_stage_pipeline
)
from app.services.mock_store import mock_store

client = TestClient(app)


# ============================================================================
# Synthetic Image Generators for Realistic Test Fixtures
# ============================================================================

def make_selfie_image_bytes() -> bytes:
    """Generates synthetic portrait photo with prominent human facial skin tones."""
    img = np.full((480, 480, 3), 195, dtype=np.uint8)
    # Facial skin oval (BGR: ~125, 160, 225)
    cv2.ellipse(img, (240, 230), (130, 170), 0, 0, 360, (125, 160, 225), -1)
    # Eyes and smile contours
    cv2.circle(img, (190, 190), 16, (40, 40, 50), -1)
    cv2.circle(img, (290, 190), 16, (40, 40, 50), -1)
    cv2.ellipse(img, (240, 290), (45, 18), 0, 0, 180, (40, 50, 160), 3)
    _, buf = cv2.imencode(".jpg", img)
    return buf.tobytes()


def make_indoor_scene_bytes() -> bytes:
    """Generates synthetic indoor room with warm tungsten lighting (high red, low blue)."""
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    # Warm indoor ambient: B=55, G=115, R=195 (b/r ratio = 0.28 < 0.58)
    img[:] = (55, 115, 195)
    # Wooden furniture / table silhouette
    cv2.rectangle(img, (60, 260), (580, 440), (35, 75, 140), -1)
    cv2.rectangle(img, (100, 300), (200, 410), (25, 55, 110), -1)
    _, buf = cv2.imencode(".jpg", img)
    return buf.tobytes()


def make_unrelated_object_bytes() -> bytes:
    """Generates an unrelated solid graphic / blank slide."""
    img = np.full((480, 640, 3), 245, dtype=np.uint8)  # Blown-out white slide
    _, buf = cv2.imencode(".jpg", img)
    return buf.tobytes()


def make_pristine_road_bytes() -> bytes:
    """Generates a clean, undamaged asphalt road surface with painted divider stripe."""
    np.random.seed(42)
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    base_gray = 105
    noise = np.random.normal(0, 5, (480, 640)).astype(np.int16)
    asphalt = np.clip(base_gray + noise, 80, 130).astype(np.uint8)
    img[:, :, 0] = asphalt
    img[:, :, 1] = asphalt
    img[:, :, 2] = asphalt
    # White lane stripe on left
    cv2.line(img, (60, 0), (60, 480), (210, 210, 210), 4)
    _, buf = cv2.imencode(".jpg", img)
    return buf.tobytes()


def make_damaged_road_pothole_bytes() -> bytes:
    """Generates a genuine asphalt road surface containing a deep pothole cavity (D40)."""
    np.random.seed(101)
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    base_gray = 110
    noise = np.random.normal(0, 6, (480, 640)).astype(np.int16)
    asphalt = np.clip(base_gray + noise, 85, 135).astype(np.uint8)
    img[:, :, 0] = asphalt
    img[:, :, 1] = asphalt
    img[:, :, 2] = asphalt

    # Dark cavity depression with shadow contrast
    cavity_center = (320, 260)
    cv2.ellipse(img, cavity_center, (75, 48), 10, 0, 360, (30, 30, 30), -1)
    cv2.ellipse(img, cavity_center, (55, 32), 10, 0, 360, (15, 15, 15), -1)

    _, buf = cv2.imencode(".jpg", img)
    return buf.tobytes()


# ============================================================================
# Test Cases: Stage 1 Rejections & Stage 2 Gating
# ============================================================================

def test_stage1_rejects_selfie_and_skips_stage2(tmp_path: Path):
    """
    Stage 1 must reject selfies.
    Stage 2 must be SKIPPED (zero inference, zero detections).
    """
    img_path = tmp_path / "test_selfie.jpg"
    img_path.write_bytes(make_selfie_image_bytes())

    result = two_stage_pipeline.process(img_path)

    # 1. Stage 1 verification
    stage1 = result["stage1_validation"]
    assert stage1["is_valid_road"] is False
    assert stage1["status"] == "rejected"
    assert stage1["rejection_category"] in ["selfie", "people_only", "person"]
    assert "Invalid Image" in stage1["error_message"]

    # 2. Stage 2 verification: Strictly SKIPPED
    stage2 = result["stage2_damage_detection"]
    assert stage2["executed"] is False
    assert stage2["status"] == "skipped"
    assert stage2["damage_detected"] is False
    assert len(stage2["detections"]) == 0

    # 3. Final decision
    final = result["final_decision"]
    assert final["accepted"] is False
    assert final["report_status"] == "rejected"
    assert final["is_hazard"] is False


def test_stage1_rejects_indoor_scene_and_skips_stage2(tmp_path: Path):
    """
    Stage 1 must reject indoor photos (warm tungsten lighting spectrum).
    Stage 2 must be SKIPPED.
    """
    img_path = tmp_path / "test_indoor.jpg"
    img_path.write_bytes(make_indoor_scene_bytes())

    result = two_stage_pipeline.process(img_path)

    # Stage 1 verification
    stage1 = result["stage1_validation"]
    assert stage1["is_valid_road"] is False
    assert stage1["status"] == "rejected"
    assert stage1["rejection_category"] == "indoor_scene"
    assert "indoor" in stage1["error_message"].lower()

    # Stage 2 verification: Skipped
    stage2 = result["stage2_damage_detection"]
    assert stage2["executed"] is False
    assert stage2["status"] == "skipped"
    assert len(stage2["detections"]) == 0

    # Final decision
    assert result["final_decision"]["report_status"] == "rejected"
    assert result["final_decision"]["is_hazard"] is False


def test_stage1_rejects_unrelated_blank_objects(tmp_path: Path):
    """
    Stage 1 must reject unrelated overexposed blank graphics.
    Stage 2 must not run.
    """
    img_path = tmp_path / "test_blank.jpg"
    img_path.write_bytes(make_unrelated_object_bytes())

    result = two_stage_pipeline.process(img_path)

    stage1 = result["stage1_validation"]
    assert stage1["is_valid_road"] is False
    assert stage1["status"] == "rejected"
    assert stage1["rejection_category"] in ["overexposed", "flat_uniform_surface"]

    stage2 = result["stage2_damage_detection"]
    assert stage2["executed"] is False
    assert stage2["damage_detected"] is False


def test_stage1_passes_clean_road_and_stage2_detects_no_damage(tmp_path: Path):
    """
    Stage 1 must accept normal pristine road surface.
    Stage 2 must execute and report "No Damage Detected" with 0 detections.
    Never fabricates fake hazards.
    """
    img_path = tmp_path / "test_clean_road.jpg"
    img_path.write_bytes(make_pristine_road_bytes())

    result = two_stage_pipeline.process(img_path)

    # 1. Stage 1 passed
    stage1 = result["stage1_validation"]
    assert stage1["is_valid_road"] is True
    assert stage1["status"] == "passed"
    assert stage1["rejection_category"] is None

    # 2. Stage 2 executed and confirmed zero defects
    stage2 = result["stage2_damage_detection"]
    assert stage2["executed"] is True
    assert stage2["status"] == "no_damage_detected"
    assert stage2["damage_detected"] is False
    assert stage2["detections_count"] == 0
    assert len(stage2["detections"]) == 0
    assert stage2["hazard_category"] == "No Damage Detected"

    # 3. Final decision
    final = result["final_decision"]
    assert final["accepted"] is True
    assert final["report_status"] == "no_damage_detected"
    assert final["report_title"] == "Road Image - No Damage Detected"
    assert final["is_hazard"] is False


def test_stage1_passes_damaged_road_and_stage2_detects_damage(tmp_path: Path):
    """
    Stage 1 must accept damaged road surface.
    Stage 2 must execute and detect real defects (pothole/crack)
    saving actual class, confidence, bounding boxes, severity, and area.
    """
    img_path = tmp_path / "test_damaged_road.jpg"
    img_path.write_bytes(make_damaged_road_pothole_bytes())

    result = two_stage_pipeline.process(img_path)

    # 1. Stage 1 passed
    stage1 = result["stage1_validation"]
    assert stage1["is_valid_road"] is True
    assert stage1["status"] == "passed"

    # 2. Stage 2 executed and detected damage
    stage2 = result["stage2_damage_detection"]
    assert stage2["executed"] is True
    assert stage2["status"] == "damage_detected"
    assert stage2["damage_detected"] is True
    assert stage2["detections_count"] >= 1
    assert len(stage2["detections"]) >= 1

    # Check detection payload details
    det = stage2["detections"][0]
    assert det["class_id"] in ["D40", "D00", "D10", "D20"]
    assert isinstance(det["class_name"], str)
    assert 0.35 <= det["confidence"] <= 1.0
    assert len(det["bbox"]) == 4
    x1, y1, x2, y2 = det["bbox"]
    assert x2 > x1 and y2 > y1
    assert det["severity"] in ["critical", "high", "medium", "low"]
    assert det["estimated_area_sqm"] > 0

    # 3. Final decision
    final = result["final_decision"]
    assert final["accepted"] is True
    assert final["is_hazard"] is True
    assert final["report_status"] == "pending_review"


# ============================================================================
# API Endpoint Integration Tests: /validate-image and /upload
# ============================================================================

def test_api_validate_image_endpoint_selfie():
    """
    The dedicated /api/v1/observations/validate-image endpoint must return
    separate Stage 1 and Stage 2 inspection results without raising HTTP 422.
    """
    selfie_bytes = make_selfie_image_bytes()
    res = client.post(
        "/api/v1/observations/validate-image",
        files={"file": ("selfie.jpg", io.BytesIO(selfie_bytes), "image/jpeg")}
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["success"] is True

    # Separate Stage 1 & Stage 2 results
    stage1 = body["stage1_road_validation"]
    stage2 = body["stage2_damage_detection"]

    assert stage1["is_valid_road"] is False
    assert stage1["status"] == "rejected"

    assert stage2["executed"] is False
    assert stage2["status"] == "skipped"
    assert len(stage2["detections"]) == 0


def test_api_validate_image_endpoint_clean_road():
    """
    /api/v1/observations/validate-image on clean road returns Stage 1 passed,
    Stage 2 executed with 0 defects.
    """
    clean_bytes = make_pristine_road_bytes()
    res = client.post(
        "/api/v1/observations/validate-image",
        files={"file": ("clean_road.jpg", io.BytesIO(clean_bytes), "image/jpeg")}
    )
    assert res.status_code == 200, res.text
    body = res.json()

    assert body["stage1_road_validation"]["is_valid_road"] is True
    assert body["stage2_damage_detection"]["executed"] is True
    assert body["stage2_damage_detection"]["status"] == "no_damage_detected"
    assert body["stage2_damage_detection"]["damage_detected"] is False
    assert body["final_decision"]["is_hazard"] is False


def test_api_upload_endpoint_records_separate_stage_results():
    """
    /api/v1/observations/upload must persist separate stage1_validation and
    stage2_damage_detection sub-objects and processing logs in the observation record.
    """
    damaged_bytes = make_damaged_road_pothole_bytes()
    res = client.post(
        "/api/v1/observations/upload",
        files={"file": ("damaged_road.jpg", io.BytesIO(damaged_bytes), "image/jpeg")},
        data={"vehicle_id": "MOB-CITIZEN-01", "latitude": 30.7333, "longitude": 76.7794}
    )
    assert res.status_code == 201, res.text
    data = res.json()["data"]

    # Must contain separate stage results
    assert "stage1_validation" in data
    assert data["stage1_validation"]["is_valid_road"] is True
    assert data["stage1_validation"]["status"] == "passed"

    assert "stage2_damage_detection" in data
    assert data["stage2_damage_detection"]["executed"] is True
    assert data["stage2_damage_detection"]["damage_detected"] is True

    # Processing logs must show both stages
    steps = [log["step"] for log in data["processing_logs"]]
    assert "stage1_road_surface_validation" in steps
    assert "stage2_damage_detection" in steps
