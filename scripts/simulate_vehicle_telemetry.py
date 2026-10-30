import csv
import io
import time
import requests
import sys
from pathlib import Path

API_URL = "http://localhost:8199/api/v1/observations/upload"
CSV_PATH = Path("data/chandigarh_simulated_telemetry.csv")

def generate_sample_image():
    # Valid minimal 1x1 JPEG byte stream
    return (
        b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xFF\xDB\x00C\x00\x03\x02\x02\x03\x02\x02\x03\x03\x03"
        b"\x03\x04\x03\x03\x04\x05\x08\x05\x05\x04\x04\x05\n\x07\x07\x06\x08\x0C\n\x0C\x0C\x0B\n\x0B\x0B\r\x0E\x12\x10\r\x0E\x11"
        b"\x0E\x0B\x0B\x10\x16\x10\x11\x13\x14\x15\x15\x15\x0C\x0F\x17\x18\x16\x14\x18\x12\x14\x15\x14\xFF\xC0\x00\x0B\x08\x00\x01"
        b"\x00\x01\x01\x01\x11\x00\xFF\xC4\x00\x1F\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02"
        b"\x03\x04\x05\x06\x07\x08\t\n\x0B\xFF\xDA\x00\x08\x01\x01\x00\x00?\x00\xBF\x00\xFF\xD9"
    )

def run_simulation(count=5, delay_sec=1.5):
    print("=" * 70)
    print("JanDrishti – Chandigarh Fleet Telemetry & Sensor Ingestion (Dev 5)")
    print(f"Target Endpoint: {API_URL}")
    print(f"Data Source:     {CSV_PATH} [DEMO DATA - SIMULATED READINGS]")
    print("=" * 70)

    if not CSV_PATH.exists():
        print(f"[!] Telemetry CSV {CSV_PATH} not found. Generating default stream.")
        rows = [
            {"vehicle_id": "CTU-BUS-104", "sector": "Sector 17", "latitude": "30.7408", "longitude": "76.7825", "speed_kmph": "34.5", "telemetry_z_shock_ms2": "3.85"},
            {"vehicle_id": "MC-WASTE-88", "sector": "Sector 22", "latitude": "30.7305", "longitude": "76.7720", "speed_kmph": "28.0", "telemetry_z_shock_ms2": "4.20"},
            {"vehicle_id": "CHD-PATROL-12", "sector": "Sector 34", "latitude": "30.7228", "longitude": "76.7682", "speed_kmph": "40.0", "telemetry_z_shock_ms2": "1.80"},
            {"vehicle_id": "CTU-BUS-219", "sector": "Industrial Area Phase 1", "latitude": "30.7060", "longitude": "76.8040", "speed_kmph": "26.5", "telemetry_z_shock_ms2": "4.90"},
        ]
    else:
        with open(CSV_PATH, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = list(reader)

    img_data = generate_sample_image()
    stream_count = min(count, len(rows))

    for i in range(stream_count):
        row = rows[i]
        v_id = row.get("vehicle_id", "CTU-BUS-104")
        sec = row.get("sector", "Sector 17")
        lat = float(row.get("latitude", 30.7408))
        lon = float(row.get("longitude", 76.7825))
        spd = float(row.get("speed_kmph", 35.0))
        z_shock = float(row.get("telemetry_z_shock_ms2", 3.2))

        payload = {
            "vehicle_id": v_id,
            "latitude": lat,
            "longitude": lon,
            "altitude": 320.0,
            "speed_kmph": spd,
            "telemetry_z_shock": z_shock
        }

        files = {
            "file": (f"frame_chd_{i}.jpg", io.BytesIO(img_data), "image/jpeg")
        }

        print(f"\n[Packet #{i+1}] {v_id} | {sec} | Lat: {lat:.5f}, Lng: {lon:.5f} | Speed: {spd} km/h | Z-Shock: {z_shock} m/s²")
        try:
            res = requests.post(API_URL, data=payload, files=files, timeout=6)
            if res.status_code == 201:
                data = res.json()["data"]
                det_count = len(data.get("detections", []))
                snapped_to = data.get("matched_road_name", data.get("linked_segment_id"))
                dist = data.get("snapping_distance_meters")
                print(f"  [+] Ingested -> ID: {data['observation_id']}")
                print(f"      AI Detections: {det_count} anomaly/anomalies (YOLO/RDD2022)")
                print(f"      GPS Snapped:   {snapped_to} ({dist}m from centerline)")
            else:
                print(f"  [-] Failed with status {res.status_code}: {res.text}")
        except Exception as e:
            print(f"  [!] Connection failed: {e}. (Is backend server running on port 8199?)")

        if i < stream_count - 1:
            time.sleep(delay_sec)

    print("\n[SUCCESS] Chandigarh vehicle telemetry simulation completed.\n")

if __name__ == "__main__":
    c = int(sys.argv[1]) if len(sys.argv) > 1 else 4
    run_simulation(count=c)
