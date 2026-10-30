import copy
import json
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any

class MockDataStore:
    """
    In-memory data store providing contract-compliant state for all 6 collections.
    Contains Chandigarh demo data across Sector 17, Sector 22, Sector 34, and Industrial Area Phase 1.
    All synthetic/demo data is explicitly labeled as [DEMO DATA - SIMULATED].
    """
    def __init__(self):
        self.users: List[Dict[str, Any]] = [
            {
                "user_id": "USR-101",
                "email": "officer@jandrishti.gov.in",
                "hashed_password": "$2b$12$eD8mD2F6K6b1rJ8O0M6a.eJ0J3T6G2o.4V9wR1q8z9e4n6k5v3a", # pass: HackathonPassword2026!
                "full_name": "Municipal Chief Engineer (Chandigarh)",
                "role": "municipal_officer",
                "ward_id": "SEC-17",
                "created_at": "2026-10-30T09:00:00Z"
            },
            {
                "user_id": "USR-102",
                "email": "contractor@infra.com",
                "hashed_password": "$2b$12$eD8mD2F6K6b1rJ8O0M6a.eJ0J3T6G2o.4V9wR1q8z9e4n6k5v3a",
                "full_name": "Shivalik Road Builders & Contractors",
                "role": "contractor",
                "ward_id": "SEC-22",
                "created_at": "2026-10-30T09:15:00Z"
            }
        ]

        self.vehicles: List[Dict[str, Any]] = [
            {
                "vehicle_id": "CTU-BUS-104",
                "vehicle_type": "bus",
                "operator_name": "Gurpreet Singh (CTU)",
                "status": "active",
                "last_known_location": {"type": "Point", "coordinates": [76.8040, 30.7060]},
                "last_active_at": datetime.now(timezone.utc).isoformat(),
                "data_label": "[DEMO DATA - SIMULATED VEHICLE]"
            },
            {
                "vehicle_id": "MC-WASTE-88",
                "vehicle_type": "waste_truck",
                "operator_name": "Harish Sharma (MC Chandigarh)",
                "status": "active",
                "last_known_location": {"type": "Point", "coordinates": [76.7720, 30.7305]},
                "last_active_at": datetime.now(timezone.utc).isoformat(),
                "data_label": "[DEMO DATA - SIMULATED VEHICLE]"
            },
            {
                "vehicle_id": "CHD-PATROL-12",
                "vehicle_type": "inspection_van",
                "operator_name": "Inspector Jaswinder Singh",
                "status": "active",
                "last_known_location": {"type": "Point", "coordinates": [76.7825, 30.7408]},
                "last_active_at": datetime.now(timezone.utc).isoformat(),
                "data_label": "[DEMO DATA - SIMULATED VEHICLE]"
            }
        ]

        # Load Chandigarh road segments from JSON or use built-in fallback
        self.road_segments: List[Dict[str, Any]] = self._load_chandigarh_segments()

        # Load observations
        self.observations: List[Dict[str, Any]] = self._load_chandigarh_observations()
        # Mirrors the database unique indexes while running without MongoDB.
        self.report_ids = {o.get("report_id") for o in self.observations if o.get("report_id")}
        self.deduplication_keys = {o.get("deduplication_key") for o in self.observations if o.get("deduplication_key")}

        # Load repair records
        self.repair_records: List[Dict[str, Any]] = self._load_chandigarh_repairs()
        self.video_inspections: List[Dict[str, Any]] = []

        # Initial Risk Assessments
        self.risk_assessments: List[Dict[str, Any]] = [
            {
                "assessment_id": "RSK-CHD-2026-01",
                "segment_id": "RS-CHD-IND-PH1-019",
                "segment_name": "Industrial Area Phase 1 Spine Road",
                "sector": "Industrial Area Phase 1",
                "health_score": 36.5,
                "failure_probability": 0.88,
                "risk_level": "critical",
                "recommended_action": "emergency_resurfacing",
                "hazard_factors": {
                    "pothole_cluster_density": 0.92,
                    "monsoon_drainage_risk": 0.85,
                    "traffic_vibration_index": 0.89
                },
                "contributing_hazards": [
                    {"type": "Heavy Freight Wheel Ruts", "weight": 0.45},
                    {"type": "Water Logging Runoff Index", "weight": 0.35},
                    {"type": "Deep Pothole Cavities (D00)", "weight": 0.20}
                ],
                "estimated_cost_inr": 485000.0,
                "assessed_at": datetime.now(timezone.utc).isoformat(),
                "data_label": "[DEMO DATA - MULTI-HAZARD FUSION]"
            },
            {
                "assessment_id": "RSK-CHD-2026-02",
                "segment_id": "RS-CHD-SEC-22-011",
                "segment_name": "Sector 22 Shastri Market Promenade",
                "sector": "Sector 22",
                "health_score": 54.0,
                "failure_probability": 0.58,
                "risk_level": "fair",
                "recommended_action": "patching_required",
                "hazard_factors": {
                    "pothole_cluster_density": 0.52,
                    "monsoon_drainage_risk": 0.60,
                    "traffic_vibration_index": 0.55
                },
                "contributing_hazards": [
                    {"type": "Alligator Cracking Clusters (D10)", "weight": 0.50},
                    {"type": "Pedestrian & Delivery Transit", "weight": 0.30},
                    {"type": "Minor Surface Depressions", "weight": 0.20}
                ],
                "estimated_cost_inr": 175000.0,
                "assessed_at": datetime.now(timezone.utc).isoformat(),
                "data_label": "[DEMO DATA - MULTI-HAZARD FUSION]"
            }
        ]

    def _load_chandigarh_segments(self) -> List[Dict[str, Any]]:
        seg_paths = [
            Path("backend/app/data/chandigarh_segments.json"),
            Path("data/chandigarh_segments.json"),
            Path(__file__).resolve().parent.parent / "data" / "chandigarh_segments.json"
        ]
        for p in seg_paths:
            if p.exists():
                try:
                    with open(p, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        if data:
                            return data
                except Exception as e:
                    print(f"Error loading {p}: {e}")

        # Fallback minimal Chandigarh segments
        return [
            {
                "segment_id": "RS-CHD-SEC-17-001",
                "name": "Madhya Marg (Sector 17)",
                "ward_id": "SEC-17",
                "area_name": "Sector 17",
                "geometry": {"type": "LineString", "coordinates": [[76.7760, 30.7450], [76.7820, 30.7445], [76.7885, 30.7440]]},
                "length_meters": 1199.8,
                "health_score": 74.0,
                "status_category": "fair",
                "hazard_count": 2,
                "data_source": "OpenStreetMap Chandigarh [DEMO DATA]"
            },
            {
                "segment_id": "RS-CHD-SEC-22-007",
                "name": "Udyog Path (Sector 22)",
                "ward_id": "SEC-22",
                "area_name": "Sector 22",
                "geometry": {"type": "LineString", "coordinates": [[76.7660, 30.7360], [76.7720, 30.7365], [76.7780, 30.7370]]},
                "length_meters": 1150.0,
                "health_score": 54.0,
                "status_category": "fair",
                "hazard_count": 4,
                "data_source": "OpenStreetMap Chandigarh [DEMO DATA]"
            },
            {
                "segment_id": "RS-CHD-SEC-34-013",
                "name": "Sarovar Path (Sector 34)",
                "ward_id": "SEC-34",
                "area_name": "Sector 34",
                "geometry": {"type": "LineString", "coordinates": [[76.7745, 30.7265], [76.7740, 30.7225], [76.7735, 30.7185]]},
                "length_meters": 890.0,
                "health_score": 84.5,
                "status_category": "good",
                "hazard_count": 0,
                "data_source": "OpenStreetMap Chandigarh [DEMO DATA]"
            },
            {
                "segment_id": "RS-CHD-IND-PH1-019",
                "name": "Industrial Area Phase 1 Spine Road",
                "ward_id": "IND-PH1",
                "area_name": "Industrial Area Phase 1",
                "geometry": {"type": "LineString", "coordinates": [[76.7950, 30.7060], [76.8040, 30.7055], [76.8130, 30.7050]]},
                "length_meters": 1720.0,
                "health_score": 36.5,
                "status_category": "critical",
                "hazard_count": 7,
                "data_source": "OpenStreetMap Chandigarh [DEMO DATA]"
            }
        ]

    def _load_chandigarh_observations(self) -> List[Dict[str, Any]]:
        obs_paths = [
            Path("data/chandigarh_demo_observations.json"),
            Path("backend/app/data/chandigarh_demo_observations.json"),
            Path(__file__).resolve().parent.parent.parent.parent / "data" / "chandigarh_demo_observations.json"
        ]
        for p in obs_paths:
            if p.exists():
                try:
                    with open(p, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        if data:
                            for item in data:
                                if "created_at" not in item:
                                    item["created_at"] = item.get("captured_at") or datetime.now(timezone.utc).isoformat()
                            return data
                except Exception:
                    pass
        return []

    def _load_chandigarh_repairs(self) -> List[Dict[str, Any]]:
        rep_paths = [
            Path("data/chandigarh_demo_repairs.json"),
            Path("backend/app/data/chandigarh_demo_repairs.json"),
            Path(__file__).resolve().parent.parent.parent.parent / "data" / "chandigarh_demo_repairs.json"
        ]
        for p in rep_paths:
            if p.exists():
                try:
                    with open(p, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        if data:
                            return data
                except Exception:
                    pass
        return []

mock_store = MockDataStore()
