"""
Tests verifying exact user-reported edge cases:
1. User pothole photo (media_1793400222685_ce9b876c.jpg) MUST be detected as damaged road (D40 pothole), NOT 'No Damage Detected'.
2. User selfie photo (media_1793403473864_1a276f8b.jpg) MUST be rejected by Stage 1 with HTTP 422, NEVER marked 'No Damage Detected'.
"""

import pytest
from pathlib import Path
from io import BytesIO
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

POTHOLE_PATH = Path('/Users/ankitkumar/.gemini/antigravity/brain/c30ba9fa-a953-48e4-a1de-2bd2a5a7a643/.user_uploaded/media_1793400222685_ce9b876c.jpg')
SELFIE_PATH = Path('/Users/ankitkumar/.gemini/antigravity/brain/c30ba9fa-a953-48e4-a1de-2bd2a5a7a643/.user_uploaded/media_1793403473864_1a276f8b.jpg')


def test_user_pothole_image_detects_damage():
    """Verify that the user's uploaded pothole image detects road defects and does not return no_damage_detected."""
    if not POTHOLE_PATH.exists():
        pytest.skip("Test image not present in artifacts directory")

    pothole_bytes = POTHOLE_PATH.read_bytes()
    response = client.post(
        "/api/v1/observations/upload",
        files={"file": ("pothole.jpg", pothole_bytes, "image/jpeg")},
        data={
            "vehicle_id": "MOB-TEST",
            "latitude": "30.7398",
            "longitude": "76.7827",
            "sector": "Sector 17"
        }
    )
    assert response.status_code == 201, f"Expected 201 Created, got {response.status_code}: {response.text}"
    body = response.json()
    obs = body["data"]
    assert obs["is_hazard"] is True, "Pothole image must be recognized as a hazard"
    assert obs["report_status"] in ("pending_review", "accepted")
    assert obs["report_status"] != "no_damage_detected"
    assert obs["hazard_category"] == "Potholes"
    assert len(obs["detections"]) > 0, "Pothole image must have bounding box detections"
    first_det = obs["detections"][0]
    assert first_det["class_id"] in ("D40", "D10", "D00", "D20")
    assert first_det["confidence"] >= 0.70


def test_user_selfie_image_rejected_at_stage1():
    """Verify that the user's selfie image is rejected with HTTP 422 and never labeled No Damage Detected."""
    if not SELFIE_PATH.exists():
        pytest.skip("Test image not present in artifacts directory")

    selfie_bytes = SELFIE_PATH.read_bytes()
    response = client.post(
        "/api/v1/observations/upload",
        files={"file": ("selfie.jpg", selfie_bytes, "image/jpeg")},
        data={
            "vehicle_id": "MOB-TEST",
            "latitude": "30.7398",
            "longitude": "76.7827",
            "sector": "Sector 17"
        }
    )
    assert response.status_code == 422, f"Expected 422, got {response.status_code}: {response.text}"
    detail = response.json().get("detail", "")
    assert "Invalid Image" in detail
    assert "Selfie" in detail or "portrait" in detail
