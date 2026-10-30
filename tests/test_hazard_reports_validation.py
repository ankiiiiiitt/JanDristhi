import io
import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.mock_store import mock_store

client = TestClient(app)


def generate_selfie_image() -> bytes:
    """Creates synthetic portrait with human skin tones and facial outline."""
    img = np.zeros((480, 480, 3), dtype=np.uint8)
    img[:] = (210, 200, 190)  # Neutral background
    # Large face oval with human skin tones (BGR: ~ [120, 150, 220])
    cv2.ellipse(img, (240, 240), (140, 180), 0, 0, 360, (125, 160, 225), -1)
    # Eye markers
    cv2.circle(img, (190, 200), 18, (50, 40, 30), -1)
    cv2.circle(img, (290, 200), 18, (50, 40, 30), -1)
    # Smile contour
    cv2.ellipse(img, (240, 300), (45, 20), 0, 0, 180, (40, 40, 180), 3)
    _, buf = cv2.imencode(".jpg", img)
    return buf.tobytes()


def generate_indoor_scene_image() -> bytes:
    """Creates synthetic indoor scene with warm tungsten lighting (high red, low blue)."""
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    # Warm domestic lighting: B=60, G=120, R=195 (b/r ratio ~ 0.30 < 0.58)
    img[:] = (60, 120, 195)
    # Indoor wooden table/desk outline
    cv2.rectangle(img, (80, 260), (560, 440), (40, 80, 150), -1)
    cv2.rectangle(img, (120, 300), (220, 400), (30, 60, 120), -1)
    _, buf = cv2.imencode(".jpg", img)
    return buf.tobytes()


def generate_pristine_road_image() -> bytes:
    """Creates genuine asphalt road surface texture with zero damage/cracks/potholes."""
    np.random.seed(42)
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    # Uniform neutral dark asphalt gray
    base_gray = 105
    noise = np.random.normal(0, 5, (480, 640)).astype(np.int16)
    asphalt = np.clip(base_gray + noise, 80, 130).astype(np.uint8)
    img[:, :, 0] = asphalt  # B
    img[:, :, 1] = asphalt  # G
    img[:, :, 2] = asphalt  # R
    # White painted road lane dividing strip on left
    cv2.line(img, (60, 0), (60, 480), (210, 210, 210), 4)
    _, buf = cv2.imencode(".jpg", img)
    return buf.tobytes()


def generate_pothole_road_image() -> bytes:
    """Creates realistic road image containing a distinct asphalt cavity pothole (D40)."""
    np.random.seed(101)
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    base_gray = 110
    noise = np.random.normal(0, 6, (480, 640)).astype(np.int16)
    asphalt = np.clip(base_gray + noise, 85, 135).astype(np.uint8)
    img[:, :, 0] = asphalt
    img[:, :, 1] = asphalt
    img[:, :, 2] = asphalt

    # Distinct pothole cavity (dark inner depression with rim contrast)
    cavity_center = (320, 260)
    # Outer dark shadow
    cv2.ellipse(img, cavity_center, (75, 48), 10, 0, 360, (30, 30, 30), -1)
    # Inner deep cavity depression
    cv2.ellipse(img, cavity_center, (55, 32), 10, 0, 360, (15, 15, 15), -1)

    _, buf = cv2.imencode(".jpg", img)
    return buf.tobytes()


def test_reject_selfie_before_creating_hazard_report():
    """
    Selfies, human faces, and portraits must be rejected with 422
    BEFORE any hazard report is created.
    """
    selfie_bytes = generate_selfie_image()
    initial_count = len(mock_store.observations)

    res = client.post(
        "/api/v1/observations/upload",
        files={"file": ("citizen_selfie.jpg", io.BytesIO(selfie_bytes), "image/jpeg")},
        data={"vehicle_id": "MOB-4321", "latitude": 30.7333, "longitude": 76.7794}
    )

    assert res.status_code == 422
    assert "selfie" in res.text.lower() or "facial" in res.text.lower() or "human" in res.text.lower()
    # Confirm NO observation or hazard was created
    assert len(mock_store.observations) == initial_count


def test_reject_indoor_scene_before_creating_hazard_report():
    """
    Indoor environments and warm domestic tungsten lighting must be rejected with 422
    BEFORE creating a hazard report.
    """
    indoor_bytes = generate_indoor_scene_image()
    initial_count = len(mock_store.observations)

    res = client.post(
        "/api/v1/observations/upload",
        files={"file": ("indoor_photo.jpg", io.BytesIO(indoor_bytes), "image/jpeg")},
        data={"vehicle_id": "MOB-4321", "latitude": 30.7333, "longitude": 76.7794}
    )

    assert res.status_code == 422
    assert "indoor" in res.text.lower()
    assert len(mock_store.observations) == initial_count


def test_clean_road_marked_as_no_damage_detected():
    """
    When genuine road imagery has no damage, it must be marked as:
    - report_status: "no_damage_detected"
    - report_title: "Road Image - No Damage Detected"
    - is_hazard: False
    - hazard_category: "No Damage Detected"
    NOT a hazard!
    """
    clean_bytes = generate_pristine_road_image()

    res = client.post(
        "/api/v1/observations/upload",
        files={"file": ("pristine_road.jpg", io.BytesIO(clean_bytes), "image/jpeg")},
        data={"vehicle_id": "MOB-4321", "latitude": 30.7360, "longitude": 76.7660}
    )

    assert res.status_code == 201, res.text
    data = res.json()["data"]
    assert data["road_photo_validated"] is True
    assert data["report_status"] == "no_damage_detected"
    assert data["report_title"] == "Road Image - No Damage Detected"
    assert data["is_hazard"] is False
    assert data["hazard_category"] == "No Damage Detected"
    assert len(data["detections"]) == 0


def test_damaged_road_creates_pending_review_hazard_report():
    """
    Citizen road photo with genuine damage creates a hazard report with:
    - report_status: "pending_review"
    - is_hazard: True
    - hazard_category matching detection (e.g. Potholes)
    - Valid confidence and bbox (no simulated confidence)
    """
    pothole_bytes = generate_pothole_road_image()

    res = client.post(
        "/api/v1/observations/upload",
        files={"file": ("damaged_road.jpg", io.BytesIO(pothole_bytes), "image/jpeg")},
        data={"vehicle_id": "MOB-4321", "latitude": 30.7362, "longitude": 76.7720}
    )

    assert res.status_code == 201, res.text
    data = res.json()["data"]
    assert data["road_photo_validated"] is True
    assert data["report_status"] == "pending_review"
    assert data["is_hazard"] is True
    assert len(data["detections"]) > 0

    first_det = data["detections"][0]
    assert first_det["class_id"] in ["D40", "D20", "D00", "D10"]
    assert 0.0 <= first_det["confidence"] <= 1.0
    assert len(first_det["bbox"]) == 4


def test_status_update_across_all_four_lifecycle_statuses():
    """
    Verifies PATCH /api/v1/observations/{id}/status for all 4 lifecycle statuses:
    'pending_review', 'accepted', 'rejected', 'no_damage_detected'.
    """
    pothole_bytes = generate_pothole_road_image()
    res = client.post(
        "/api/v1/observations/upload",
        files={"file": ("status_flow_test.jpg", io.BytesIO(pothole_bytes), "image/jpeg")},
        data={"vehicle_id": "MOB-8888", "latitude": 30.7360, "longitude": 76.7660}
    )
    obs_id = res.json()["data"]["observation_id"]

    # 1. Update to accepted
    res_acc = client.patch(f"/api/v1/observations/{obs_id}/status", json={"status": "accepted"})
    assert res_acc.status_code == 200
    assert res_acc.json()["data"]["report_status"] == "accepted"

    # 2. Update to rejected
    res_rej = client.patch(f"/api/v1/observations/{obs_id}/status", json={"status": "rejected"})
    assert res_rej.status_code == 200
    assert res_rej.json()["data"]["report_status"] == "rejected"

    # 3. Update to no_damage_detected
    res_nd = client.patch(f"/api/v1/observations/{obs_id}/status", json={"status": "no_damage_detected"})
    assert res_nd.status_code == 200
    assert res_nd.json()["data"]["report_status"] == "no_damage_detected"

    # 4. Update back to pending_review
    res_pr = client.patch(f"/api/v1/observations/{obs_id}/status", json={"status": "pending_review"})
    assert res_pr.status_code == 200
    assert res_pr.json()["data"]["report_status"] == "pending_review"

    # 5. Invalid status raises 400
    res_bad = client.patch(f"/api/v1/observations/{obs_id}/status", json={"status": "invalid_status_xyz"})
    assert res_bad.status_code == 400


def test_query_filtering_by_report_status():
    """
    Verifies GET /api/v1/observations?report_status={status} returns records matching the status.
    """
    statuses = ["pending_review", "accepted", "no_damage_detected", "rejected"]
    for s in statuses:
        res = client.get(f"/api/v1/observations?report_status={s}")
        assert res.status_code == 200
        data = res.json()["data"]
        for item in data:
            assert item.get("report_status") == s


def test_independent_gps_fix_never_invents_road_names():
    """
    Verifies that an observation captured at GPS coordinates far from any road segment
    is correctly logged as an independent GPS fix without inventing fake road network names.
    """
    clean_bytes = generate_pristine_road_image()
    # Remote coordinates away from mapped Chandigarh segments
    remote_lat = 30.8200
    remote_lng = 76.9200

    res = client.post(
        "/api/v1/observations/upload",
        files={"file": ("remote_fix.jpg", io.BytesIO(clean_bytes), "image/jpeg")},
        data={"vehicle_id": "MOB-9999", "latitude": remote_lat, "longitude": remote_lng, "sector": "Rural Outer"}
    )

    assert res.status_code == 201
    data = res.json()["data"]
    assert data["road_snapped"] is False
    assert data["linked_segment_id"] is None
    # Must NOT invent 'Chandigarh Urban Network' or snap to distant segment
    assert "Chandigarh Urban Network" not in (data["matched_road_name"] or "")
    assert "Independent GPS Fix" in (data["matched_road_name"] or "")


def test_wet_water_filled_pothole_detected_as_hazard():
    """
    Real-world water-filled potholes with specular puddle reflections
    must be detected as D40 Potholes with is_hazard: True, NOT marked as clean road.
    """
    # Create realistic water-filled puddle pothole with sky reflection inside cavity
    np.random.seed(303)
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    asphalt = np.clip(105 + np.random.normal(0, 6, (480, 640)), 80, 130).astype(np.uint8)
    img[:, :, 0] = asphalt
    img[:, :, 1] = asphalt
    img[:, :, 2] = asphalt

    # Dark broken cavity perimeter
    cavity_center = (320, 260)
    cv2.ellipse(img, cavity_center, (95, 58), 5, 0, 360, (30, 30, 30), -1)
    # Bright water reflection puddle inside the basin
    cv2.ellipse(img, cavity_center, (76, 42), 5, 0, 360, (175, 175, 180), -1)

    _, buf = cv2.imencode(".jpg", img)
    wet_bytes = buf.tobytes()

    res = client.post(
        "/api/v1/observations/upload",
        files={"file": ("wet_pothole_test.jpg", io.BytesIO(wet_bytes), "image/jpeg")},
        data={"vehicle_id": "MOB-3FB127FA", "latitude": 30.7333, "longitude": 76.7794, "sector": "Ludhiana - Chandigarh Highway"}
    )

    assert res.status_code == 201, res.text
    data = res.json()["data"]
    assert data["road_photo_validated"] is True
    assert data["report_status"] == "pending_review"
    assert data["is_hazard"] is True
    assert any(d["class_id"] == "D40" for d in data["detections"])
