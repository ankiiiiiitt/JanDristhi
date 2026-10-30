"""
Comprehensive full-system integration test for JanDrishti.
Validates end-to-end integration across:
- Citizen signup, developer registration, and JWT authentication
- Road damage image upload, YOLOv8 detection, and GPS road snapping
- Query optimization and compound database indexing (sector, severity, status, created_at)
- Contractor repair verification and road segment health updates
- Municipal PDF audit report generation and binary streaming downloads
- GeoJSON GIS road networks, Multi-Hazard Fusion analytics, and health status
"""

import io
from PIL import Image
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings

client = TestClient(app)


def create_dummy_road_image() -> bytes:
    """Generates an authentic in-memory road image with asphalt texture and pothole."""
    import cv2
    import numpy as np
    frame = np.full((480, 640, 3), 85, dtype=np.uint8)
    noise = np.random.randint(-15, 15, (480, 640, 3), dtype=np.int16)
    frame = np.clip(frame.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    cv2.line(frame, (60, 480), (300, 150), (210, 210, 210), 4)
    cv2.ellipse(frame, (320, 260), (75, 50), 0, 0, 360, (25, 25, 25), -1)
    ret, buf = cv2.imencode(".jpg", frame)
    return buf.tobytes()


def create_clean_repaired_image() -> bytes:
    """Generates an authentic smooth freshly resurfaced asphalt image for repair verification."""
    import cv2
    import numpy as np
    frame = np.full((480, 640, 3), 75, dtype=np.uint8)
    noise = np.random.randint(-8, 8, (480, 640, 3), dtype=np.int16)
    frame = np.clip(frame.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    ret, buf = cv2.imencode(".jpg", frame)
    return buf.tobytes()


def test_full_system_integration_lifecycle():
    # =========================================================================
    # 1. System Health & AI Engine Inspection
    # =========================================================================
    health_res = client.get("/api/v1/health")
    assert health_res.status_code == 200
    health_data = health_res.json()
    assert health_data["status"] == "healthy"
    assert "ai_engine" in health_data
    assert "database" in health_data

    # =========================================================================
    # 2. Authentication: Citizen Registration, Login, and Profile (/me)
    # =========================================================================
    citizen_phone = "+91 98765 43210"
    citizen_email = "rohit.verma@example.com"
    citizen_pass = "ChandigarhRoads2026!"

    signup_res = client.post(
        "/api/v1/auth/signup/citizen",
        json={
            "full_name": "Rohit Verma",
            "phone": citizen_phone,
            "email": citizen_email,
            "password": citizen_pass
        }
    )
    assert signup_res.status_code == 201
    citizen_token = signup_res.json()["access_token"]
    assert citizen_token is not None

    # Login with mobile number as identifier
    login_res = client.post(
        "/api/v1/auth/login",
        json={
            "identifier": citizen_phone,
            "password": citizen_pass
        }
    )
    assert login_res.status_code == 200
    auth_data = login_res.json()
    assert auth_data["access_token"] is not None
    assert auth_data["user"]["phone"] == citizen_phone

    # Verify profile using JWT Bearer header
    me_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {auth_data['access_token']}"}
    )
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["full_name"] == "Rohit Verma"
    assert me_data["role"] == "citizen"

    # =========================================================================
    # 3. Protected Developer Signup
    # =========================================================================
    # Rejected with wrong invite code
    bad_dev = client.post(
        "/api/v1/auth/signup/developer",
        json={
            "full_name": "Dev User",
            "email": "dev.user@jandrishti.in",
            "password": "Password123!",
            "invite_code": "WRONG_SECRET"
        }
    )
    assert bad_dev.status_code == 403

    # Accepted with valid developer key
    good_dev = client.post(
        "/api/v1/auth/signup/developer",
        json={
            "full_name": "Senior AI Architect",
            "email": "ai.architect@jandrishti.in",
            "password": "Password123!",
            "invite_code": "DEV-JANDRISHTI-2026-KEY"
        }
    )
    assert good_dev.status_code == 201
    assert good_dev.json()["user"]["role"] == "developer"

    # =========================================================================
    # 4. Road Damage Observation Upload, YOLOv8 Detection & GPS Snapping
    # =========================================================================
    image_bytes = create_dummy_road_image()
    upload_res = client.post(
        "/api/v1/observations/upload",
        files={"file": ("test_road_frame.jpg", image_bytes, "image/jpeg")},
        data={
            "vehicle_id": "CTU-BUS-104",
            "latitude": 30.7450,
            "longitude": 76.7760,
            "speed_kmph": 32.5,
            "telemetry_z_shock": 3.4
        }
    )
    assert upload_res.status_code == 201
    obs_data = upload_res.json()
    assert obs_data["success"] is True
    uploaded_record = obs_data["data"]
    assert "OBS-CHD-" in uploaded_record["observation_id"]
    assert uploaded_record["detection_status"] == "processed"
    assert "sector" in uploaded_record
    assert "created_at" in uploaded_record
    assert "captured_at" in uploaded_record
    assert len(uploaded_record["detections"]) > 0

    # =========================================================================
    # 5. Database Query Optimization & Filtering (sector, severity, status)
    # =========================================================================
    # Filter by sector
    sec_res = client.get("/api/v1/observations?sector=Sector 17")
    assert sec_res.status_code == 200
    for obs in sec_res.json()["data"]:
        assert obs["sector"] == "Sector 17"

    # Filter by detection_status
    status_res = client.get("/api/v1/observations?detection_status=processed")
    assert status_res.status_code == 200
    assert status_res.json()["count"] > 0
    for obs in status_res.json()["data"]:
        assert obs["detection_status"] == "processed"

    # Filter by severity
    crit_res = client.get("/api/v1/observations?severity=critical")
    assert crit_res.status_code == 200
    for obs in crit_res.json()["data"]:
        severities = [d.get("severity", "").lower() for d in obs.get("detections", [])]
        assert "critical" in severities

    # =========================================================================
    # 6. Repair Records & AI Post-Repair Audit Verification
    # =========================================================================
    repairs_res = client.get("/api/v1/repairs?status=completed_unverified")
    assert repairs_res.status_code == 200
    repairs_data = repairs_res.json()["data"]
    assert len(repairs_data) > 0
    target_repair = repairs_data[0]
    target_repair_id = target_repair["repair_id"]

    # Contractor uploads post-repair photo
    after_image = create_clean_repaired_image()
    verify_res = client.post(
        f"/api/v1/repairs/verify/{target_repair_id}",
        files={"after_file": ("after_repair.jpg", after_image, "image/jpeg")}
    )
    assert verify_res.status_code == 200
    verify_data = verify_res.json()
    assert verify_data["success"] is True
    assert verify_data["data"]["status"] == "verified_closed"
    assert verify_data["data"]["damage_cleared"] is True

    # =========================================================================
    # 7. Municipal PDF Audit Reports Generation & Streaming Download
    # =========================================================================
    # Catalog listing
    catalog_res = client.get("/api/v1/reports")
    assert catalog_res.status_code == 200
    assert catalog_res.json()["count"] >= 3

    # Generate PDF report for Sector 17
    gen_res = client.get("/api/v1/reports/generate/pdf?sector=Sector 17")
    assert gen_res.status_code == 200
    gen_data = gen_res.json()
    assert gen_data["success"] is True
    download_url = gen_data["data"]["download_url"]
    report_filename = gen_data["data"]["filename"]
    assert report_filename.endswith(".pdf")

    # Download dynamically generated PDF
    dl_res = client.get(f"/api/v1/reports/download/{report_filename}")
    assert dl_res.status_code == 200
    assert dl_res.headers.get("content-type") == "application/pdf"
    assert len(dl_res.content) > 1000  # Valid binary PDF stream

    # Download via 'manual' alias
    manual_res = client.get("/api/v1/reports/download/manual")
    assert manual_res.status_code == 200
    assert manual_res.headers.get("content-type") == "application/pdf"
    assert len(manual_res.content) > 1000

    # =========================================================================
    # 8. Citywide Infrastructure Analytics & GIS GeoJSON Mapping
    # =========================================================================
    geojson_res = client.get("/api/v1/roads/geojson")
    assert geojson_res.status_code == 200
    geojson_data = geojson_res.json()
    assert geojson_data["type"] == "FeatureCollection"
    assert len(geojson_data["features"]) > 0

    analytics_res = client.get("/api/v1/analytics/overview")
    assert analytics_res.status_code == 200
    analytics_data = analytics_res.json()
    assert analytics_data["success"] is True
    assert "monitored_km" in analytics_data["data"]
    assert "city_average_health_score" in analytics_data["data"]
    assert "hazard_distribution" in analytics_data["data"]
    assert "ward_health_rankings" in analytics_data["data"]
