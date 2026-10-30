from typing import List, Dict, Any

class MultiHazardRiskPredictor:
    """
    Multi-Hazard Fusion & Infrastructure Health Scoring Engine.
    Fuses computer-vision road damage observations with vehicle accelerometer
    telemetry and external environmental risk indices.
    """
    def __init__(self):
        # Weights for hazard fusion
        self.w_pothole = 0.40
        self.w_cracks = 0.25
        self.w_vibration = 0.20
        self.w_monsoon = 0.15

    def calculate_health_and_risk(
        self,
        detections: List[Dict[str, Any]],
        telemetry_z_shock: float = 0.0,
        traffic_volume_factor: float = 0.65,
        monsoon_runoff_index: float = 0.50
    ) -> Dict[str, Any]:
        """
        Calculates composite Infrastructure Health Score (IHS) and Failure Probability.
        """
        # 1. Pothole and crack severity indices
        pothole_count = sum(1 for d in detections if d.get("class_id") == "D00")
        pothole_area = sum(d.get("estimated_area_sqm", 0.0) for d in detections if d.get("class_id") == "D00")
        crack_count = sum(1 for d in detections if d.get("class_id") in ["D10", "D20", "D40"])

        # Normalized damage index (0.0 to 1.0)
        pothole_impact = min(1.0, (pothole_count * 0.3) + (pothole_area * 0.4))
        crack_impact = min(1.0, crack_count * 0.25)

        # Vibration shock index (normalized above 2.0 m/s^2)
        vibration_impact = min(1.0, max(0.0, (telemetry_z_shock - 1.0) / 4.0))

        # Composite Multi-Hazard Risk (0.0 to 1.0)
        composite_risk = (
            (self.w_pothole * pothole_impact) +
            (self.w_cracks * crack_impact) +
            (self.w_vibration * vibration_impact) +
            (self.w_monsoon * monsoon_runoff_index)
        ) * (0.8 + (0.2 * traffic_volume_factor))

        composite_risk = max(0.05, min(0.98, composite_risk))

        # Infrastructure Health Score: 100 is pristine, 0 is failed
        health_score = round(max(5.0, 100.0 - (composite_risk * 90.0)), 1)
        failure_probability = round(composite_risk, 2)

        # Urgency & Action Recommendation
        if health_score < 45.0:
            risk_level = "critical"
            recommended_action = "emergency_resurfacing"
            cost_multiplier = 3500.0 # per sqm
        elif health_score < 70.0:
            risk_level = "fair"
            recommended_action = "patching_required"
            cost_multiplier = 1800.0
        else:
            risk_level = "good"
            recommended_action = "routine_monitoring"
            cost_multiplier = 400.0

        estimated_cost = round(max(15000.0, (pothole_area + 0.5) * 50 * cost_multiplier), -2)

        return {
            "health_score": health_score,
            "failure_probability": failure_probability,
            "risk_level": risk_level,
            "recommended_action": recommended_action,
            "estimated_cost_inr": estimated_cost,
            "hazard_factors": {
                "pothole_cluster_density": round(pothole_impact, 2),
                "crack_fatigue_index": round(crack_impact, 2),
                "telemetry_shock_vibration": round(vibration_impact, 2),
                "monsoon_drainage_risk": round(monsoon_runoff_index, 2)
            },
            "contributing_hazards": [
                {"type": "Pothole Density", "weight": round(pothole_impact * self.w_pothole, 2)},
                {"type": "Structural Cracking", "weight": round(crack_impact * self.w_cracks, 2)},
                {"type": "Vehicular Shock (Z-axis)", "weight": round(vibration_impact * self.w_vibration, 2)},
                {"type": "Monsoon Runoff Vulnerability", "weight": round(monsoon_runoff_index * self.w_monsoon, 2)}
            ]
        }

