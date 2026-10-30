import json
import pytest
import sys
from pathlib import Path
from fastapi.testclient import TestClient

backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.append(str(backend_dir))

from app.main import app

client = TestClient(app)

def test_collector_status():
    response = client.get("/api/v1/collector/status")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["default_sensor_source"] == "PHONE_IMU_SMARTPHONE"

def test_collector_sessions_list():
    response = client.get("/api/v1/collector/sessions")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert isinstance(data["data"], list)

def test_collector_upload_session_telemetry():
    # 2 telemetry points in Sector 17
    telemetry = [
        {
            "timestamp": "2026-10-30T08:30:00Z",
            "video_time_ms": 0,
            "latitude": 30.7408,
            "longitude": 76.7825,
            "altitude": 345.0,
            "accuracy_m": 3.8,
            "speed_kmph": 28.5,
            "raw_accel": {"x": 0.2, "y": 9.6, "z": 1.2},
            "calibrated_z_shock": 2.85,
            "sensor_source": "PHONE_IMU_SMARTPHONE",
            "is_calibrated": True
        },
        {
            "timestamp": "2026-10-30T08:30:02Z",
            "video_time_ms": 2000,
            "latitude": 30.7410,
            "longitude": 76.7830,
            "altitude": 345.5,
            "accuracy_m": 4.1,
            "speed_kmph": 30.2,
            "raw_accel": {"x": 0.1, "y": 9.8, "z": 0.9},
            "calibrated_z_shock": 1.45,
            "sensor_source": "PHONE_IMU_SMARTPHONE",
            "is_calibrated": True
        }
    ]

    response = client.post(
        "/api/v1/collector/upload-session",
        data={
            "telemetry_json": json.dumps(telemetry),
            "session_id": "SES-TEST-001",
            "vehicle_id": "TEST-PHONE-VEH",
            "operator_name": "Test Field Collector"
        }
    )

    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert res["session_id"] == "SES-TEST-001"
    assert len(res["observations"]) >= 1
    assert res["observations"][0]["sensor_source"] == "PHONE_IMU_SMARTPHONE"
    assert "RS-CHD" in res["observations"][0]["linked_segment_id"]
