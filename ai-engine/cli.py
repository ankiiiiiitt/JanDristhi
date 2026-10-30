import argparse
import json
import sys
from pathlib import Path

# Add current directory to path
sys.path.append(str(Path(__file__).resolve().parent))

from detector import RoadDamageDetector
from image_processor import ImageProcessor
from risk_predictor import MultiHazardRiskPredictor

def main():
    parser = argparse.ArgumentParser(description="JanDrishti AI Road Damage & Multi-Hazard Risk Evaluator")
    parser.add_argument("--image", type=str, required=True, help="Path to input road surface image")
    parser.add_argument("--output-dir", type=str, default="ai-engine/output", help="Directory to save annotated image")
    parser.add_argument("--z-shock", type=float, default=2.8, help="Telemetry Z-axis accelerometer reading (m/s^2)")
    args = parser.parse_args()

    image_path = Path(args.image)
    if not image_path.exists():
        print(f"[!] Warning: Image '{image_path}' not found on disk. Generating synthetic evaluation.")

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    annotated_output_path = output_dir / f"annotated_{image_path.name if image_path.name else 'road.jpg'}"

    print("\n" + "=" * 60)
    print("JanDrishti – AI Road Intelligence Pipeline")
    print("=" * 60)

    # 1. Damage Detection
    print("[1] Executing Road Damage Detection (YOLO)...")
    detector = RoadDamageDetector()
    detections = detector.detect(str(image_path))
    print(f"    -> Found {len(detections)} road surface anomaly/anomalies.")
    for idx, d in enumerate(detections, 1):
        print(f"       [{idx}] {d['class_name']} ({d['class_id']}) | Conf: {d['confidence']*100:.1f}% | Severity: {d['severity']} | Area: {d['estimated_area_sqm']} m²")

    # 2. Image Processing & Annotation
    print("\n[2] Rendering Bounding Boxes & CLAHE Preprocessing (OpenCV)...")
    processor = ImageProcessor()
    if image_path.exists():
        processor.draw_detections(str(image_path), detections, str(annotated_output_path))
        print(f"    -> Saved annotated audit image to: {annotated_output_path}")

    # 3. Multi-Hazard Fusion & Risk Prediction
    print("\n[3] Computing Multi-Hazard Fusion & Infrastructure Health Score...")
    risk_engine = MultiHazardRiskPredictor()
    risk_profile = risk_engine.calculate_health_and_risk(detections, telemetry_z_shock=args.z_shock)

    print(f"    -> Infrastructure Health Score (IHS): {risk_profile['health_score']} / 100")
    print(f"    -> 30-Day Structural Failure Probability: {risk_profile['failure_probability'] * 100:.1f}%")
    print(f"    -> Urgency Category: {risk_profile['risk_level'].upper()}")
    print(f"    -> Action Recommendation: {risk_profile['recommended_action'].replace('_', ' ').title()}")
    print(f"    -> Estimated Remediation Cost: INR {risk_profile['estimated_cost_inr']:,.2f}")

    print("\n[+] Full Result JSON:")
    print(json.dumps({
        "detections": detections,
        "risk_profile": risk_profile
    }, indent=2))
    print("=" * 60 + "\n")

if __name__ == "__main__":
    main()
