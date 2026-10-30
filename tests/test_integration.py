import pytest
import io
from fastapi.testclient import TestClient
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.append(str(backend_dir))

from app.main import app

client = TestClient(app)

def test_full_urban_infrastructure_lifecycle():
    """
    Validates end-to-end integration:
    1. Vehicle Data Collection (Dev 5)
    2. AI Road Damage Detection (Dev 2)
    3. GPS Location & MongoDB Storage (Dev 4)
    4. Multi-Hazard Fusion & Risk Score (Dev 2 & 3)
    5. Municipal Dashboard / GeoJSON Delivery (Dev 1)
    6. Repair Verification (Dev 5 & 1)
    """
    print("\n--- [E2E STEP 1 & 2] Vehicle Telemetry & Image Ingestion + AI Inference ---")
    import cv2
    import numpy as np
    frame = np.full((480, 640, 3), 85, dtype=np.uint8)
    noise = np.random.randint(-15, 15, (480, 640, 3), dtype=np.int16)
    frame = np.clip(frame.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    cv2.line(frame, (60, 480), (300, 150), (210, 210, 210), 4)
    cv2.ellipse(frame, (320, 260), (75, 50), 0, 0, 360, (25, 25, 25), -1)
    ret, buf = cv2.imencode(".jpg", frame)
    fake_image_bytes = buf.tobytes()
    upload_response = client.post(
        "/api/v1/observations/upload",
        files={"file": ("test_road_frame.jpg", io.BytesIO(fake_image_bytes), "image/jpeg")},
        data={
            "vehicle_id": "CTU-BUS-104",
            "latitude": 30.7408,
            "longitude": 76.7825,
            "altitude": 320.0,
            "speed_kmph": 38.0,
            "telemetry_z_shock": 3.85
        }
    )
    assert upload_response.status_code == 201, upload_response.text
    obs_data = upload_response.json()["data"]
    assert obs_data["observation_id"].startswith("OBS-")
    assert obs_data["detection_status"] == "processed"
    assert len(obs_data["detections"]) > 0

    print("--- [E2E STEP 3 & 4] Multi-Hazard Fusion & Risk Evaluation ---")
    target_seg = obs_data.get('linked_segment_id') or "RS-CHD-SEC-17-001"
    risk_response = client.post(f"/api/v1/risk/evaluate/{target_seg}")
    assert risk_response.status_code == 200
    risk_data = risk_response.json()["data"]
    assert "health_score" in risk_data
    assert "failure_probability" in risk_data

    print("--- [E2E STEP 5] Municipal GeoJSON Generation for Leaflet Map ---")
    geojson_res = client.get("/api/v1/roads/geojson")
    assert geojson_res.status_code == 200
    geojson = geojson_res.json()
    assert geojson["type"] == "FeatureCollection"
    assert len(geojson["features"]) > 0

    print("--- [E2E STEP 6] Post-Repair Audit & Verification ---")
    rep_frame = np.full((480, 640, 3), 75, dtype=np.uint8)
    rep_noise = np.random.randint(-8, 8, (480, 640, 3), dtype=np.int16)
    rep_frame = np.clip(rep_frame.astype(np.int16) + rep_noise, 0, 255).astype(np.uint8)
    _, rep_buf = cv2.imencode(".jpg", rep_frame)
    repaired_bytes = rep_buf.tobytes()

    repairs_list = client.get("/api/v1/repairs").json()["data"]
    test_repair_id = repairs_list[0]["repair_id"] if repairs_list else "REP-CHD-2026-01"
    repair_verify_res = client.post(
        f"/api/v1/repairs/verify/{test_repair_id}",
        files={"after_file": ("repaired_road.jpg", io.BytesIO(repaired_bytes), "image/jpeg")}
    )
    assert repair_verify_res.status_code == 200
    repair_result = repair_verify_res.json()["data"]
    assert repair_result["status"] == "verified_closed"
    assert repair_result["ai_verification_score"] > 0.90
    print("[+] Complete 9-stage urban infrastructure lifecycle passed!")

