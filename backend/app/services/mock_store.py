import copy
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any

class MockDataStore:
    """
    In-memory data store providing contract-compliant state for all 6 collections.
    Used for local testing when MongoDB Atlas is not yet configured.
    """
    def __init__(self):
        self.users: List[Dict[str, Any]] = [
            {
                "user_id": "USR-101",
                "email": "officer@jandrishti.gov.in",
                "hashed_password": "$2b$12$eD8mD2F6K6b1rJ8O0M6a.eJ0J3T6G2o.4V9wR1q8z9e4n6k5v3a", # pass: HackathonPassword2026!
                "full_name": "Dr. Ananya Rao",
                "role": "municipal_officer",
                "ward_id": "WARD-174",
                "created_at": "2026-10-30T09:00:00Z"
            },
            {
                "user_id": "USR-102",
                "email": "contractor@infra.com",
                "hashed_password": "$2b$12$eD8mD2F6K6b1rJ8O0M6a.eJ0J3T6G2o.4V9wR1q8z9e4n6k5v3a",
                "full_name": "Suresh Infra Works",
                "role": "contractor",
                "ward_id": "WARD-174",
                "created_at": "2026-10-30T09:15:00Z"
            }
        ]

        self.vehicles: List[Dict[str, Any]] = [
            {
                "vehicle_id": "VEH-KA04-9122",
                "vehicle_type": "waste_truck",
                "operator_name": "Anil Patil",
                "status": "active",
                "last_known_location": {"type": "Point", "coordinates": [77.5946, 12.9716]},
                "last_active_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "vehicle_id": "VEH-KA01-3310",
                "vehicle_type": "inspection_van",
                "operator_name": "Ramesh Kumar",
                "status": "active",
                "last_known_location": {"type": "Point", "coordinates": [77.6085, 12.9790]},
                "last_active_at": datetime.now(timezone.utc).isoformat()
            }
        ]

        self.road_segments: List[Dict[str, Any]] = [
            {
                "segment_id": "RS-MG-01",
                "name": "MG Road - Trinity Circle to Brigade Junction",
                "ward_id": "WARD-174",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [
                        [77.6095, 12.9738],
                        [77.6145, 12.9745],
                        [77.6189, 12.9752]
                    ]
                },
                "length_meters": 1150.0,
                "health_score": 42.0,
                "status_category": "critical",
                "hazard_count": 6,
                "last_inspected_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "segment_id": "RS-ORR-02",
                "name": "Outer Ring Road - Marathahalli Flyover Segment",
                "ward_id": "WARD-150",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [
                        [77.6970, 12.9560],
                        [77.7020, 12.9575],
                        [77.7065, 12.9590]
                    ]
                },
                "length_meters": 1400.0,
                "health_score": 68.5,
                "status_category": "fair",
                "hazard_count": 2,
                "last_inspected_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "segment_id": "RS-IND-03",
                "name": "100 Feet Road - Indiranagar 12th Main Stretch",
                "ward_id": "WARD-112",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [
                        [77.6410, 12.9780],
                        [77.6415, 12.9720],
                        [77.6420, 12.9660]
                    ]
                },
                "length_meters": 1300.0,
                "health_score": 88.0,
                "status_category": "good",
                "hazard_count": 0,
                "last_inspected_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "segment_id": "RS-KOR-04",
                "name": "Koramangala 80 Feet Road - Sony World Signal to 6th Block",
                "ward_id": "WARD-151",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [
                        [77.6250, 12.9340],
                        [77.6290, 12.9345],
                        [77.6340, 12.9350]
                    ]
                },
                "length_meters": 950.0,
                "health_score": 38.0,
                "status_category": "critical",
                "hazard_count": 8,
                "last_inspected_at": datetime.now(timezone.utc).isoformat()
            }
        ]

        self.observations: List[Dict[str, Any]] = [
            {
                "observation_id": "OBS-20261030-001",
                "vehicle_id": "VEH-KA04-9122",
                "location": {"type": "Point", "coordinates": [77.6145, 12.9745]},
                "altitude": 920.4,
                "speed_kmph": 32.5,
                "telemetry_z_shock": 4.12,
                "image_url": "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80",
                "detection_status": "processed",
                "detections": [
                    {
                        "class_id": "D00",
                        "class_name": "Pothole",
                        "confidence": 0.92,
                        "bbox": [150, 200, 320, 420],
                        "severity": "critical",
                        "estimated_area_sqm": 0.65
                    }
                ],
                "linked_segment_id": "RS-MG-01",
                "captured_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "observation_id": "OBS-20261030-002",
                "vehicle_id": "VEH-KA01-3310",
                "location": {"type": "Point", "coordinates": [77.6290, 12.9345]},
                "altitude": 915.0,
                "speed_kmph": 28.0,
                "telemetry_z_shock": 3.45,
                "image_url": "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80",
                "detection_status": "processed",
                "detections": [
                    {
                        "class_id": "D10",
                        "class_name": "Alligator Cracking",
                        "confidence": 0.84,
                        "bbox": [100, 120, 400, 500],
                        "severity": "high",
                        "estimated_area_sqm": 1.20
                    }
                ],
                "linked_segment_id": "RS-KOR-04",
                "captured_at": datetime.now(timezone.utc).isoformat()
            }
        ]

        self.risk_assessments: List[Dict[str, Any]] = [
            {
                "assessment_id": "RSK-20261030-01",
                "segment_id": "RS-MG-01",
                "health_score": 42.0,
                "failure_probability": 0.85,
                "risk_level": "critical",
                "recommended_action": "emergency_resurfacing",
                "hazard_factors": {
                    "pothole_cluster_density": 0.88,
                    "monsoon_drainage_risk": 0.72,
                    "traffic_vibration_index": 0.80
                },
                "contributing_hazards": [
                    {"type": "Deep Pothole Cluster", "weight": 0.45},
                    {"type": "Water Logging Runoff", "weight": 0.35},
                    {"type": "Heavy Bus Transit Shock", "weight": 0.20}
                ],
                "estimated_cost_inr": 350000.0,
                "assessed_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "assessment_id": "RSK-20261030-02",
                "segment_id": "RS-KOR-04",
                "health_score": 38.0,
                "failure_probability": 0.89,
                "risk_level": "critical",
                "recommended_action": "emergency_resurfacing",
                "hazard_factors": {
                    "pothole_cluster_density": 0.91,
                    "monsoon_drainage_risk": 0.85,
                    "traffic_vibration_index": 0.75
                },
                "contributing_hazards": [
                    {"type": "Severe Alligator Cracks", "weight": 0.50},
                    {"type": "Drainage Edge Collapse", "weight": 0.30},
                    {"type": "Commercial Freight Traffic", "weight": 0.20}
                ],
                "estimated_cost_inr": 420000.0,
                "assessed_at": datetime.now(timezone.utc).isoformat()
            }
        ]

        self.repair_records: List[Dict[str, Any]] = [
            {
                "repair_id": "REP-20261030-01",
                "segment_id": "RS-MG-01",
                "contractor_name": "Karnataka Urban Infra Ltd.",
                "status": "completed_unverified",
                "before_image_url": "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80",
                "after_image_url": "https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=800&auto=format&fit=crop&q=80",
                "ai_verification_score": 0.94,
                "damage_cleared": True,
                "verified_by_user_id": None,
                "created_at": "2026-10-30T08:00:00Z",
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "repair_id": "REP-20261030-02",
                "segment_id": "RS-ORR-02",
                "contractor_name": "Apex Roadworks Corp",
                "status": "verified_closed",
                "before_image_url": "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80",
                "after_image_url": "https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=800&auto=format&fit=crop&q=80",
                "ai_verification_score": 0.98,
                "damage_cleared": True,
                "verified_by_user_id": "USR-101",
                "created_at": "2026-10-29T10:00:00Z",
                "updated_at": "2026-10-30T09:30:00Z"
            }
        ]

mock_store = MockDataStore()
