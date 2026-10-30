import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.database.mongodb import db_manager, INDEX_SPECIFICATIONS
from app.services.mock_store import mock_store

client = TestClient(app)

def test_index_specifications_contain_required_compound_indexes():
    """Validates that composite indexes for sector, severity, and detection_status with created_at exist."""
    obs_indexes = INDEX_SPECIFICATIONS.get("observations", [])
    index_keys = [spec[0] for spec in obs_indexes]

    # Verify sector + created_at
    assert [("sector", 1), ("created_at", -1)] in index_keys, "Missing ('sector', 1), ('created_at', -1) index"

    # Verify detections.severity + created_at
    assert [("detections.severity", 1), ("created_at", -1)] in index_keys, "Missing ('detections.severity', 1), ('created_at', -1) index"

    # Verify detection_status + created_at
    assert [("detection_status", 1), ("created_at", -1)] in index_keys, "Missing ('detection_status', 1), ('created_at', -1) index"

    # Verify composite sector + detection_status + created_at
    assert [("sector", 1), ("detection_status", 1), ("created_at", -1)] in index_keys

    # Verify single created_at
    assert [("created_at", -1)] in index_keys

    # Check repair_records indexes
    rep_indexes = INDEX_SPECIFICATIONS.get("repair_records", [])
    rep_keys = [spec[0] for spec in rep_indexes]
    assert [("status", 1), ("created_at", -1)] in rep_keys
    assert [("sector", 1), ("created_at", -1)] in rep_keys

    # Check road_segments indexes
    road_indexes = INDEX_SPECIFICATIONS.get("road_segments", [])
    road_keys = [spec[0] for spec in road_indexes]
    assert [("ward_id", 1), ("health_score", 1)] in road_keys

@pytest.mark.anyio
async def test_ensure_indexes_execution():
    """Tests that _ensure_indexes iterates across collections and calls create_index."""
    mock_db = MagicMock()
    mock_col = MagicMock()
    mock_col.create_index = AsyncMock(return_value="mock_index_name")
    mock_db.__getitem__.return_value = mock_col

    created = await db_manager._ensure_indexes(target_db=mock_db)

    assert len(created) > 0
    assert mock_col.create_index.call_count == len(created)

def test_query_observations_filter_by_sector():
    """Tests querying observations filtered by sector."""
    response = client.get("/api/v1/observations?sector=Sector 22")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) > 0
    for obs in data["data"]:
        assert obs["sector"] == "Sector 22"

def test_query_observations_filter_by_severity():
    """Tests querying observations filtered by damage severity."""
    response = client.get("/api/v1/observations?severity=critical")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) > 0
    for obs in data["data"]:
        severities = [d.get("severity", "").lower() for d in obs.get("detections", [])]
        assert "critical" in severities

def test_query_observations_filter_by_detection_status():
    """Tests querying observations filtered by detection status."""
    response = client.get("/api/v1/observations?detection_status=processed")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) > 0
    for obs in data["data"]:
        assert obs["detection_status"] == "processed"

def test_query_observations_composite_filter():
    """Tests querying observations filtered by both sector and severity."""
    response = client.get("/api/v1/observations?sector=Industrial Area Phase 1&severity=critical")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) > 0
    for obs in data["data"]:
        assert obs["sector"] == "Industrial Area Phase 1"
        severities = [d.get("severity", "").lower() for d in obs.get("detections", [])]
        assert "critical" in severities

def test_query_repairs_filter_by_status_and_sector():
    """Tests querying repairs filtered by status and sector."""
    response = client.get("/api/v1/repairs?status=verified_closed")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    for item in data["data"]:
        assert item["status"] == "verified_closed"

    response_sector = client.get("/api/v1/repairs?sector=Sector 17")
    assert response_sector.status_code == 200
    data_sector = response_sector.json()
    assert data_sector["success"] is True
    for item in data_sector["data"]:
        assert item["sector"] == "Sector 17"

def test_observations_contain_created_at():
    """Ensures observations returned by API contain created_at timestamp."""
    response = client.get("/api/v1/observations?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert len(data["data"]) > 0
    for obs in data["data"]:
        assert "created_at" in obs
        assert obs["created_at"] is not None
