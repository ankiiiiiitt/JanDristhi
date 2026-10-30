"""
Unit and Integration Test Suite: False-Positive AI Prevention and RDD2022 Validation.
====================================================================================
Validates all 9 core requirements:
1. Reject non-road images before YOLO inference.
2. Correct RDD2022 class mapping: D00=Longitudinal, D10=Transverse, D20=Alligator, D40=Pothole.
3. Never label a selfie or unrelated image as road damage.
4. Validate detection confidence and bounding boxes.
5. Do not assign Critical severity without valid damage assessment.
6. Verify GPS and road snapping independently.
7. Show rejected images as Invalid Image, not Accepted & Geotagged.
8. Store actual model predictions and processing logs.
9. Test with road images, pothole images, selfies and unrelated images.
"""

import io
import tempfile
from pathlib import Path
import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.road_photo_validation import validate_road_photo
from detector import RoadDamageDetector, DAMAGE_CLASSES, assess_damage_severity

client = TestClient(app)


def generate_selfie_image() -> bytes:
    """Generates an image containing a prominent human portrait/face skin tone."""
    frame = np.full((480, 640, 3), 140, dtype=np.uint8)
    # Human skin tone ellipse in upper/center frame (BGR: 135, 168, 225)
    cv2.ellipse(frame, (320, 220), (110, 150), 0, 0, 360, (135, 168, 225), -1)
    # Facial feature shadows
    cv2.circle(frame, (280, 190), 15, (60, 60, 70), -1)
    cv2.circle(frame, (360, 190), 15, (60, 60, 70), -1)
    cv2.ellipse(frame, (320, 280), (45, 20), 0, 0, 180, (80, 90, 170), -1)
    _, buf = cv2.imencode(".jpg", frame)
    return buf.tobytes()


def generate_unrelated_blank_image() -> bytes:
    """Generates a solid white/blank image (overexposed, no road texture)."""
    frame = np.full((480, 640, 3), 248, dtype=np.uint8)
    _, buf = cv2.imencode(".jpg", frame)
    return buf.tobytes()


def generate_unrelated_green_turf_image() -> bytes:
    """Generates a vivid green lawn/turf image (non-road high saturation)."""
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    frame[:, :] = (35, 210, 45) # BGR green
    noise = np.random.randint(-15, 15, (480, 640, 3), dtype=np.int16)
    frame = np.clip(frame.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    _, buf = cv2.imencode(".jpg", frame)
    return buf.tobytes()


def generate_pristine_road_image() -> bytes:
    """Generates a genuine asphalt road surface without any damage."""
    frame = np.full((480, 640, 3), 80, dtype=np.uint8)
    noise = np.random.randint(-14, 14, (480, 640, 3), dtype=np.int16)
    frame = np.clip(frame.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    # Yellow center lane marking
    cv2.line(frame, (320, 0), (320, 480), (35, 175, 225), 6)
    _, buf = cv2.imencode(".jpg", frame)
    return buf.tobytes()


def generate_pothole_road_image() -> bytes:
    """Generates an authentic asphalt road image with a deep pothole cavity."""
    frame = np.full((480, 640, 3), 85, dtype=np.uint8)
    noise = np.random.randint(-15, 15, (480, 640, 3), dtype=np.int16)
    frame = np.clip(frame.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    # Road boundary line
    cv2.line(frame, (60, 480), (280, 160), (200, 200, 200), 4)
    # Dark cavity depression with shadow gradient
    cv2.ellipse(frame, (330, 270), (75, 48), 0, 0, 360, (22, 22, 22), -1)
    _, buf = cv2.imencode(".jpg", frame)
    return buf.tobytes()


def test_reject_selfie_before_inference():
    """
    Requirement 1 & 3: Never label a selfie as road damage; reject before inference.
    """
    selfie_bytes = generate_selfie_image()

    res = client.post(
        "/api/v1/observations/upload",
        files={"file": ("selfie_photo.jpg", io.BytesIO(selfie_bytes), "image/jpeg")},
        data={
            "vehicle_id": "CITIZEN-MOB",
            "latitude": 30.7450,
            "longitude": 76.7760
        }
    )

    assert res.status_code == 422
    err_msg = res.json().get("detail", "")
    assert "Invalid Image" in err_msg
    assert "Selfie" in err_msg or "portrait" in err_msg or "person" in err_msg


def test_reject_unrelated_blank_and_saturated_images():
    """
    Requirement 1 & 3: Reject non-road images (blank screens, vivid green lawns).
    """
    # 1. Blank white image
    blank_bytes = generate_unrelated_blank_image()
    res1 = client.post(
        "/api/v1/observations/upload",
        files={"file": ("blank_slide.jpg", io.BytesIO(blank_bytes), "image/jpeg")},
        data={"vehicle_id": "CITIZEN-MOB", "latitude": 30.7450, "longitude": 76.7760}
    )
    assert res1.status_code == 422
    assert "Invalid Image" in res1.json()["detail"]

    # 2. Green turf / lawn image
    green_bytes = generate_unrelated_green_turf_image()
    res2 = client.post(
        "/api/v1/observations/upload",
        files={"file": ("green_grass.jpg", io.BytesIO(green_bytes), "image/jpeg")},
        data={"vehicle_id": "CITIZEN-MOB", "latitude": 30.7450, "longitude": 76.7760}
    )
    assert res2.status_code == 422
    assert "Invalid Image" in res2.json()["detail"]


def test_clean_road_zero_false_positives():
    """
    Requirement 9: Pristine road image must be accepted as road footage with 0 defects.
    Never fabricates fake hazards.
    """
    clean_bytes = generate_pristine_road_image()
    res = client.post(
        "/api/v1/observations/upload",
        files={"file": ("clean_asphalt_road.jpg", io.BytesIO(clean_bytes), "image/jpeg")},
        data={"vehicle_id": "CITIZEN-MOB", "latitude": 30.7450, "longitude": 76.7760}
    )

    assert res.status_code == 201, res.text
    data = res.json()["data"]
    assert data["road_photo_validated"] is True
    assert data["report_status"] == "accepted"
    # Pristine road must have zero fabricated defects
    assert len(data["detections"]) == 0
    assert len(data["model_predictions"]) == 0


def test_rdd2022_class_taxonomy_and_pothole_detection():
    """
    Requirement 2 & 4: Correct RDD2022 taxonomy:
    D00 = Longitudinal Cracks, D10 = Transverse Cracks, D20 = Alligator Cracking, D40 = Potholes.
    """
    # 1. Verify taxonomy constants
    assert DAMAGE_CLASSES["D00"] == "Longitudinal Cracks"
    assert DAMAGE_CLASSES["D10"] == "Transverse Cracks"
    assert DAMAGE_CLASSES["D20"] == "Alligator Cracking"
    assert DAMAGE_CLASSES["D40"] == "Potholes"

    # 2. Detect actual pothole
    pothole_bytes = generate_pothole_road_image()
    res = client.post(
        "/api/v1/observations/upload",
        files={"file": ("pothole_road.jpg", io.BytesIO(pothole_bytes), "image/jpeg")},
        data={"vehicle_id": "CITIZEN-MOB", "latitude": 30.7450, "longitude": 76.7760}
    )

    assert res.status_code == 201
    data = res.json()["data"]
    assert len(data["detections"]) >= 1

    first_det = data["detections"][0]
    # Potholes must be mapped to D40
    assert first_det["class_id"] == "D40"
    assert first_det["class_name"] == "Potholes"
    assert first_det["confidence"] >= 0.50

    # Validate bounding box sanity: [x1, y1, x2, y2]
    bbox = first_det["bbox"]
    assert len(bbox) == 4
    assert bbox[2] > bbox[0]
    assert bbox[3] > bbox[1]


def test_severity_assessment_no_false_critical():
    """
    Requirement 5: Do not assign Critical severity without valid damage assessment.
    High confidence does not make a small crack Critical.
    """
    # Minor crack with high confidence (0.95) must NOT be critical
    sev_crack = assess_damage_severity(class_id="D00", area_sqm=0.12, confidence=0.95)
    assert sev_crack == "low"

    # Moderate alligator cracking must be medium or high, not critical
    sev_alligator = assess_damage_severity(class_id="D20", area_sqm=0.25, confidence=0.88)
    assert sev_alligator == "medium"

    # Small pothole must be medium
    sev_small_pot = assess_damage_severity(class_id="D40", area_sqm=0.18, confidence=0.90, contrast=0.20)
    assert sev_small_pot == "medium"

    # Genuinely severe pothole cavity (large area + deep contrast) receives critical
    sev_crit_pot = assess_damage_severity(class_id="D40", area_sqm=0.65, confidence=0.92, contrast=0.35)
    assert sev_crit_pot == "critical"


def test_independent_gps_and_road_snapping():
    """
    Requirement 6: Verify GPS and road snapping independently.
    Coordinates outside road proximity threshold must retain valid GPS coordinates
    while marking road_snapped=False and linked_segment_id=None.
    """
    road_img = generate_pothole_road_image()

    # Coordinates in central New Delhi (outside Chandigarh road segment threshold)
    delhi_lat = 28.613939
    delhi_lng = 77.209021

    res = client.post(
        "/api/v1/observations/upload",
        files={"file": ("delhi_inspection.jpg", io.BytesIO(road_img), "image/jpeg")},
        data={
            "vehicle_id": "MOB-DELHI",
            "latitude": delhi_lat,
            "longitude": delhi_lng,
            "sector": "Central Delhi"
        }
    )

    assert res.status_code == 201
    data = res.json()["data"]

    # GPS coordinates are preserved exactly
    assert data["latitude"] == delhi_lat
    assert data["longitude"] == delhi_lng
    assert data["gps_verified"] is True

    # Road snapping is evaluated independently: outside threshold -> not falsely snapped
    assert data["road_snapped"] is False
    assert data["linked_segment_id"] is None
    assert "Independent GPS Fix" in data["matched_road_name"]


def test_store_actual_model_predictions_and_processing_logs():
    """
    Requirement 8: Store actual model predictions and processing logs.
    """
    road_img = generate_pothole_road_image()

    res = client.post(
        "/api/v1/observations/upload",
        files={"file": ("inspection_with_audit.jpg", io.BytesIO(road_img), "image/jpeg")},
        data={"vehicle_id": "CITIZEN-MOB", "latitude": 30.7450, "longitude": 76.7760}
    )

    assert res.status_code == 201
    data = res.json()["data"]

    # 1. Model predictions stored
    assert "model_predictions" in data
    assert isinstance(data["model_predictions"], list)
    assert len(data["model_predictions"]) >= 1

    # 2. Processing logs audit trail stored
    assert "processing_logs" in data
    assert isinstance(data["processing_logs"], list)
    steps = [log["step"] for log in data["processing_logs"]]
    assert "pre_inference_admission" in steps
    assert "ai_inference" in steps
    assert "independent_gps_verification" in steps
    assert "road_snapping_verification" in steps
