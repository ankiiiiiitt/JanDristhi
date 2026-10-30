import unittest
import sys
from pathlib import Path

# Add ai-engine to sys.path
ai_dir = Path(__file__).resolve().parent.parent / "ai-engine"
sys.path.append(str(ai_dir))

from detector import RoadDamageDetector
from risk_predictor import MultiHazardRiskPredictor

class TestAIEngine(unittest.TestCase):
    def test_road_damage_detector_fallback(self):
        detector = RoadDamageDetector()
        detections = detector.detect("non_existent_image.jpg")
        self.assertIsInstance(detections, list)
        self.assertGreater(len(detections), 0)
        first = detections[0]
        self.assertIn("class_id", first)
        self.assertIn("class_name", first)
        self.assertIn("confidence", first)
        self.assertIn("bbox", first)
        self.assertEqual(len(first["bbox"]), 4)

    def test_risk_predictor_calculation(self):
        predictor = MultiHazardRiskPredictor()
        dummy_detections = [
            {"class_id": "D40", "class_name": "Potholes", "estimated_area_sqm": 0.5, "severity": "critical"},
            {"class_id": "D20", "class_name": "Alligator Cracking", "estimated_area_sqm": 0.3, "severity": "medium"}
        ]
        result = predictor.calculate_health_and_risk(
            detections=dummy_detections,
            telemetry_z_shock=3.2,
            traffic_volume_factor=0.8,
            monsoon_runoff_index=0.6
        )
        self.assertIn("health_score", result)
        self.assertTrue(0 <= result["health_score"] <= 100)
        self.assertTrue(0.0 <= result["failure_probability"] <= 1.0)
        self.assertIn(result["risk_level"], ["good", "fair", "critical"])
        self.assertIn("recommended_action", result)
        self.assertGreater(result["estimated_cost_inr"], 0)

if __name__ == "__main__":
    unittest.main()
