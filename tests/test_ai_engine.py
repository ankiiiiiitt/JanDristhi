import pytest
import sys
from pathlib import Path

# Add ai-engine to sys.path
ai_dir = Path(__file__).resolve().parent.parent / "ai-engine"
sys.path.append(str(ai_dir))

from detector import RoadDamageDetector
from risk_predictor import MultiHazardRiskPredictor

def test_road_damage_detector():
    detector = RoadDamageDetector()
    detections = detector.detect("non_existent_image.jpg")
    assert isinstance(detections, list)
    assert len(detections) > 0
    first = detections[0]
    assert "class_id" in first
    assert "class_name" in first
    assert "confidence" in first
    assert "bbox" in first
    assert len(first["bbox"]) == 4

def test_risk_predictor_calculation():
    predictor = MultiHazardRiskPredictor()
    dummy_detections = [
        {"class_id": "D00", "class_name": "Pothole", "estimated_area_sqm": 0.5, "severity": "critical"},
        {"class_id": "D10", "class_name": "Alligator Cracking", "estimated_area_sqm": 0.3, "severity": "medium"}
    ]
    result = predictor.calculate_health_and_risk(
        detections=dummy_detections,
        telemetry_z_shock=3.2,
        traffic_volume_factor=0.8,
        monsoon_runoff_index=0.6
    )
    assert "health_score" in result
    assert 0 <= result["health_score"] <= 100
    assert 0.0 <= result["failure_probability"] <= 1.0
    assert result["risk_level"] in ["good", "fair", "critical"]
    assert "recommended_action" in result
    assert result["estimated_cost_inr"] > 0
