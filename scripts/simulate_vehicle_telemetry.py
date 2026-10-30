import time
import random
import requests
import sys
import io

API_URL = "http://localhost:8000/api/v1/observations/upload"

# Route coordinates along MG Road - Bangalore
WAYPOINTS = [
    (12.9738, 77.6095),
    (12.9741, 77.6118),
    (12.9745, 77.6145),
    (12.9749, 77.6167),
    (12.9752, 77.6189),
]

def generate_sample_image():
    # Minimal valid 1x1 JPEG byte stream
    return b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xFF\xDB\x00C\x00\x03\x02\x02\x03\x02\x02\x03\x03\x03\x03\x04\x03\x03\x04\x05\x08\x05\x05\x04\x04\x05\n\x07\x07\x06\x08\x0C\n\x0C\x0C\x0B\n\x0B\x0B\r\x0E\x12\x10\r\x0E\x11\x0E\x0B\x0B\x10\x16\x10\x11\x13\x14\x15\x15\x15\x0C\x0F\x17\x18\x16\x14\x18\x12\x14\x15\x14\xFF\xC0\x00\x0B\x08\x00\x01\x00\x01\x01\x01\x11\x00\xFF\xC4\x00\x1F\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0B\xFF\xDA\x00\x08\x01\x01\x00\x00?\x00\xBF\x00\xFF\xD9"

def run_simulation(vehicle_id="VEH-KA04-9122", count=5, delay_sec=2):
    print("=" * 65)
    print("JanDrishti – Vehicle Telemetry & Sensor Simulator (Dev 5)")
    print(f"Vehicle:   {vehicle_id}")
    print(f"Target:    {API_URL}")
    print(f"Waypoints: {len(WAYPOINTS)}")
    print("=" * 65)

    img_data = generate_sample_image()

    for i in range(count):
        lat, lng = WAYPOINTS[i % len(WAYPOINTS)]
        # Add slight jitter
        lat += random.uniform(-0.0002, 0.0002)
        lng += random.uniform(-0.0002, 0.0002)
        speed = round(random.uniform(25.0, 48.0), 1)
        # Random accelerometer spike (simulating pothole bump)
        z_shock = round(random.uniform(1.2, 4.8), 2)

        payload = {
            "vehicle_id": vehicle_id,
            "latitude": lat,
            "longitude": lng,
            "altitude": round(915.0 + random.uniform(0, 10), 1),
            "speed_kmph": speed,
            "telemetry_z_shock": z_shock
        }

        files = {
            "file": (f"frame_{i}.jpg", io.BytesIO(img_data), "image/jpeg")
        }

        print(f"\n[Telemetry Packet #{i+1}] Lat: {lat:.5f}, Lng: {lng:.5f} | Speed: {speed} km/h | Z-Shock: {z_shock} m/s²")
        try:
            res = requests.post(API_URL, data=payload, files=files, timeout=5)
            if res.status_code == 201:
                data = res.json()["data"]
                print(f"  [+] Ingested as {data['observation_id']} -> AI detected {len(data['detections'])} hazard(s)!")
            else:
                print(f"  [-] Failed with status {res.status_code}: {res.text}")
        except Exception as e:
            print(f"  [!] Connection failed: {e}. Is backend server running on port 8000?")

        if i < count - 1:
            time.sleep(delay_sec)

    print("\n[SUCCESS] Simulation run completed.\n")

if __name__ == "__main__":
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    run_simulation(count=count)
