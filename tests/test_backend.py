import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.append(str(backend_dir))

from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "database" in data
    assert "version" in data

def test_roads_geojson():
    response = client.get("/api/v1/roads/geojson")
    assert response.status_code == 200
    geojson = response.json()
    assert geojson["type"] == "FeatureCollection"
    assert isinstance(geojson["features"], list)
    if geojson["features"]:
        feature = geojson["features"][0]
        assert "properties" in feature
        assert "geometry" in feature
        assert "segment_id" in feature["properties"]
        assert "health_score" in feature["properties"]
        assert "color" in feature["properties"]

def test_analytics_overview():
    response = client.get("/api/v1/analytics/overview")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    data = body["data"]
    assert "monitored_km" in data
    assert "total_hazards_detected" in data
    assert "city_average_health_score" in data

def test_risk_evaluate_segment():
    # Fetch first segment dynamically
    geojson = client.get("/api/v1/roads/geojson").json()
    first_seg = geojson["features"][0]["properties"]["segment_id"] if geojson.get("features") else "RS-CHD-SEC-17-001"
    response = client.post(f"/api/v1/risk/evaluate/{first_seg}")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert "health_score" in body["data"]
    assert "failure_probability" in body["data"]
    assert "recommended_action" in body["data"]

def test_list_repairs():
    response = client.get("/api/v1/repairs")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert isinstance(body["data"], list)

