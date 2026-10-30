#!/usr/bin/env python3
"""
Generate Chandigarh Demo Datasets (CSV & JSON) for the 4 target areas:
- Sector 17
- Sector 22
- Sector 34
- Industrial Area Phase 1

All synthetic telemetry and observations are explicitly labeled as [DEMO DATA - SIMULATED].
"""

import csv
import json
import random
from pathlib import Path
from datetime import datetime, timezone, timedelta

def generate_demo_files():
    data_dir = Path("data")
    data_dir.mkdir(parents=True, exist_ok=True)

    # 1. Load Chandigarh segments
    seg_file = Path("backend/app/data/chandigarh_segments.json")
    if not seg_file.exists():
        print(f"[!] {seg_file} not found. Run fetch_chandigarh_osm.py first.")
        return

    with open(seg_file, "r", encoding="utf-8") as f:
        segments = json.load(f)

    # Map segments by sector
    sectors_map = {
        "SEC-17": [s for s in segments if s.get("ward_id") == "SEC-17"],
        "SEC-22": [s for s in segments if s.get("ward_id") == "SEC-22"],
        "SEC-34": [s for s in segments if s.get("ward_id") == "SEC-34"],
        "IND-PH1": [s for s in segments if s.get("ward_id") == "IND-PH1"],
    }

    # ---------------------------------------------------------
    # 2. GENERATE SIMULATED TELEMETRY CSV
    # ---------------------------------------------------------
    csv_file = data_dir / "chandigarh_simulated_telemetry.csv"
    vehicles = [
        ("CTU-BUS-104", "Chandigarh Transport Undertaking Bus 104"),
        ("MC-WASTE-88", "Municipal Sanitation Truck 88"),
        ("CHD-PATROL-12", "Smart City Patrol Van 12"),
        ("CTU-BUS-219", "Chandigarh Transport Undertaking Bus 219")
    ]

    telemetry_rows = []
    base_time = datetime.now(timezone.utc) - timedelta(hours=3)

    for i in range(120): # 120 telemetry entries
        v_id, v_desc = random.choice(vehicles)
        sec_code = random.choice(["SEC-17", "SEC-22", "SEC-34", "IND-PH1"])
        sec_segments = sectors_map.get(sec_code, segments)
        chosen_seg = random.choice(sec_segments)

        coords = chosen_seg["geometry"]["coordinates"]
        pt = random.choice(coords)
        # Add tiny realistic GPS jitter
        lon = round(pt[0] + random.uniform(-0.0003, 0.0003), 6)
        lat = round(pt[1] + random.uniform(-0.0003, 0.0003), 6)

        speed = round(random.uniform(22.0, 48.0), 1)

        # Higher shock vibration in Industrial Area Phase 1 and Sector 22
        if sec_code == "IND-PH1":
            z_shock = round(random.uniform(2.8, 5.4), 2) # severe potholes
            shock_label = "HIGH_POTHOLE_IMPACT"
        elif sec_code == "SEC-22":
            z_shock = round(random.uniform(1.8, 4.2), 2)
            shock_label = "MODERATE_CRACK_VIBRATION" if z_shock > 2.5 else "NORMAL_SURFACE"
        else:
            z_shock = round(random.uniform(0.8, 2.2), 2)
            shock_label = "SMOOTH_ASPHALT"

        entry_time = (base_time + timedelta(seconds=i*90)).isoformat()

        telemetry_rows.append({
            "timestamp": entry_time,
            "vehicle_id": v_id,
            "vehicle_name": v_desc,
            "sector": chosen_seg.get("area_name", sec_code),
            "sector_code": sec_code,
            "matched_segment_id": chosen_seg["segment_id"],
            "latitude": lat,
            "longitude": lon,
            "speed_kmph": speed,
            "telemetry_z_shock_ms2": z_shock,
            "shock_classification": shock_label,
            "data_label": "[DEMO DATA - SIMULATED VEHICLE SENSOR]"
        })

    with open(csv_file, "w", newline="", encoding="utf-8") as f:
        fieldnames = [
            "timestamp", "vehicle_id", "vehicle_name", "sector", "sector_code",
            "matched_segment_id", "latitude", "longitude", "speed_kmph",
            "telemetry_z_shock_ms2", "shock_classification", "data_label"
        ]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(telemetry_rows)

    print(f"[+] Generated Simulated Telemetry CSV: {csv_file} ({len(telemetry_rows)} records)")

    # ---------------------------------------------------------
    # 3. GENERATE CHANDIGARH DEMO OBSERVATIONS JSON
    # ---------------------------------------------------------
    obs_file = data_dir / "chandigarh_demo_observations.json"
    observations = [
        {
            "observation_id": "OBS-CHD-2026-001",
            "vehicle_id": "CTU-BUS-104",
            "location": {"type": "Point", "coordinates": [76.8040, 30.7060]},
            "altitude": 321.4,
            "speed_kmph": 31.5,
            "telemetry_z_shock": 4.65,
            "image_url": "/images/roads/road_pothole_d00.jpg",
            "detection_status": "processed",
            "detections": [
                {
                    "class_id": "D00",
                    "class_name": "Pothole",
                    "confidence": 0.94,
                    "bbox": [140, 210, 330, 430],
                    "severity": "critical",
                    "estimated_area_sqm": 0.72
                }
            ],
            "linked_segment_id": "RS-CHD-IND-PH1-019",
            "sector": "Industrial Area Phase 1",
            "captured_at": (datetime.now(timezone.utc) - timedelta(minutes=45)).isoformat(),
            "data_label": "[DEMO DATA - SIMULATED OBSERVATION]"
        },
        {
            "observation_id": "OBS-CHD-2026-002",
            "vehicle_id": "MC-WASTE-88",
            "location": {"type": "Point", "coordinates": [76.7720, 30.7305]},
            "altitude": 345.0,
            "speed_kmph": 24.0,
            "telemetry_z_shock": 3.75,
            "image_url": "/images/roads/road_alligator_d10.jpg",
            "detection_status": "processed",
            "detections": [
                {
                    "class_id": "D10",
                    "class_name": "Alligator Cracking",
                    "confidence": 0.86,
                    "bbox": [90, 110, 420, 510],
                    "severity": "high",
                    "estimated_area_sqm": 1.45
                }
            ],
            "linked_segment_id": "RS-CHD-SEC-22-011",
            "sector": "Sector 22",
            "captured_at": (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat(),
            "data_label": "[DEMO DATA - SIMULATED OBSERVATION]"
        },
        {
            "observation_id": "OBS-CHD-2026-003",
            "vehicle_id": "CHD-PATROL-12",
            "location": {"type": "Point", "coordinates": [76.7825, 30.7408]},
            "altitude": 350.2,
            "speed_kmph": 38.0,
            "telemetry_z_shock": 2.15,
            "image_url": "/images/roads/road_longitudinal_d20.jpg",
            "detection_status": "processed",
            "detections": [
                {
                    "class_id": "D20",
                    "class_name": "Longitudinal Crack",
                    "confidence": 0.79,
                    "bbox": [50, 180, 480, 240],
                    "severity": "medium",
                    "estimated_area_sqm": 0.38
                }
            ],
            "linked_segment_id": "RS-CHD-SEC-17-005",
            "sector": "Sector 17",
            "captured_at": (datetime.now(timezone.utc) - timedelta(minutes=15)).isoformat(),
            "data_label": "[DEMO DATA - SIMULATED OBSERVATION]"
        },
        {
            "observation_id": "OBS-CHD-2026-004",
            "vehicle_id": "CTU-BUS-219",
            "location": {"type": "Point", "coordinates": [76.7682, 30.7228]},
            "altitude": 338.0,
            "speed_kmph": 42.0,
            "telemetry_z_shock": 1.45,
            "image_url": "/images/roads/road_transverse_d40.jpg",
            "detection_status": "processed",
            "detections": [
                {
                    "class_id": "D40",
                    "class_name": "Transverse Crack",
                    "confidence": 0.72,
                    "bbox": [200, 100, 260, 490],
                    "severity": "medium",
                    "estimated_area_sqm": 0.25
                }
            ],
            "linked_segment_id": "RS-CHD-SEC-34-017",
            "sector": "Sector 34",
            "captured_at": (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat(),
            "data_label": "[DEMO DATA - SIMULATED OBSERVATION]"
        }
    ]

    with open(obs_file, "w", encoding="utf-8") as f:
        json.dump(observations, f, indent=2)
    print(f"[+] Generated Observations JSON: {obs_file} ({len(observations)} records)")

    # ---------------------------------------------------------
    # 4. GENERATE CHANDIGARH DEMO REPAIRS JSON
    # ---------------------------------------------------------
    repairs_file = data_dir / "chandigarh_demo_repairs.json"
    repairs = [
        {
            "repair_id": "REP-CHD-2026-01",
            "segment_id": "RS-CHD-IND-PH1-019",
            "contractor_name": "Chandigarh Highway Infrastructure Pvt Ltd",
            "status": "completed_unverified",
            "before_image_url": "/images/roads/road_pothole_d00.jpg",
            "after_image_url": "/images/roads/road_repaired_patch.jpg",
            "ai_verification_score": None,
            "damage_cleared": None,
            "sector": "Industrial Area Phase 1",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat(),
            "updated_at": (datetime.now(timezone.utc) - timedelta(hours=4)).isoformat(),
            "data_label": "[DEMO DATA - REPAIR WORK ORDER]"
        },
        {
            "repair_id": "REP-CHD-2026-02",
            "segment_id": "RS-CHD-SEC-22-011",
            "contractor_name": "Shivalik Road Builders & Contractors",
            "status": "completed_unverified",
            "before_image_url": "/images/roads/road_alligator_d10.jpg",
            "after_image_url": "/images/roads/road_repaired_fresh_asphalt.jpg",
            "ai_verification_score": None,
            "damage_cleared": None,
            "sector": "Sector 22",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=3)).isoformat(),
            "updated_at": (datetime.now(timezone.utc) - timedelta(hours=6)).isoformat(),
            "data_label": "[DEMO DATA - REPAIR WORK ORDER]"
        },
        {
            "repair_id": "REP-CHD-2026-03",
            "segment_id": "RS-CHD-SEC-17-005",
            "contractor_name": "Punjab & Haryana Municipal Works",
            "status": "verified_closed",
            "before_image_url": "/images/roads/road_longitudinal_d20.jpg",
            "after_image_url": "/images/roads/road_repaired_fresh_asphalt.jpg",
            "ai_verification_score": 0.97,
            "damage_cleared": True,
            "sector": "Sector 17",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=5)).isoformat(),
            "updated_at": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
            "data_label": "[DEMO DATA - REPAIR WORK ORDER]"
        }
    ]

    with open(repairs_file, "w", encoding="utf-8") as f:
        json.dump(repairs, f, indent=2)
    print(f"[+] Generated Repairs JSON: {repairs_file} ({len(repairs)} records)")

if __name__ == "__main__":
    generate_demo_files()

