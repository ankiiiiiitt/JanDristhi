"""
End-to-End Test Suite for JanDrishti Live Video Inspection Workflow.
===================================================================
Validates all 12 core requirements:
1. Video upload to backend storage.
2. Frame extraction using OpenCV VideoCapture.
3. Trained YOLOv8/CV damage detection (potholes & cracks).
4. Detection parameters: type, confidence, severity, frame timestamp, GPS coordinates.
5. Road footage admission & rejection of unrelated/invalid videos.
6. GPS snapping to actual Chandigarh road segments.
7. Infrastructure Health Score (IHS) calculation using multi-hazard fusion formula.
8. Persistent saving in database/storage.
9. Citizen reporting and status tracking.
10. Incident delivery for GIS mapping & dashboard.
11. Developer review, road prioritization, and repair task work order creation.
12. Before/after repair photo verification.
"""

import io
import os
import tempfile
from pathlib import Path
import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.video_processor import collector_video_processor
from app.services.road_photo_validation import validate_road_video

client = TestClient(app)


def generate_test_road_video(
    duration_frames: int = 20,
    has_pothole: bool = True,
    fps: float = 10.0,
    width: int = 640,
    height: int = 480
) -> Path:
    """Generates an authentic asphalt road video with a localized pothole defect."""
    tmp = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False)
    video_path = Path(tmp.name)
    tmp.close()

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(str(video_path), fourcc, fps, (width, height))

    for idx in range(duration_frames):
        # Base dark asphalt
        frame = np.full((height, width, 3), 85, dtype=np.uint8)
        # Asphalt granular texture noise
        noise = np.random.randint(-18, 18, (height, width, 3), dtype=np.int16)
        frame = np.clip(frame.astype(np.int16) + noise, 0, 255).astype(np.uint8)

        # Road surface lane marking
        cv2.line(frame, (int(width * 0.1), height), (int(width * 0.45), int(height * 0.3)), (200, 200, 200), 4)

        if has_pothole:
            # Pothole cavity (dark concave depression with shadow boundary)
            pot_cx = 320
            pot_cy = 310
            cv2.ellipse(frame, (pot_cx, pot_cy), (65, 42), 0, 0, 360, (28, 28, 28), -1)
            cv2.ellipse(frame, (pot_cx, pot_cy), (68, 44), 0, 0, 180, (15, 15, 15), 3)

        out.write(frame)

    out.release()
    return video_path


def generate_unrelated_blank_video() -> Path:
    """Generates a blank solid video that must be rejected by road footage validation."""
    tmp = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False)
    video_path = Path(tmp.name)
    tmp.close()

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(str(video_path), fourcc, 10.0, (640, 480))
    for _ in range(15):
        # Solid white blank screen
        frame = np.full((480, 640, 3), 255, dtype=np.uint8)
        out.write(frame)
    out.release()
    return video_path


def generate_unrelated_cartoon_video() -> Path:
    """Generates a hyper-saturated neon anime/cartoon video that must be rejected."""
    tmp = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False)
    video_path = Path(tmp.name)
    tmp.close()

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(str(video_path), fourcc, 10.0, (640, 480))
    for _ in range(15):
        # Pure neon magenta
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        frame[:, :] = [255, 0, 255]
        out.write(frame)
    out.release()
    return video_path


def generate_repaired_road_photo() -> Path:
    """Generates a smooth, freshly resurfaced asphalt photo with no defects."""
    tmp = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
    photo_path = Path(tmp.name)
    tmp.close()

    frame = np.full((480, 640, 3), 75, dtype=np.uint8)
    noise = np.random.randint(-8, 8, (480, 640, 3), dtype=np.int16)
    frame = np.clip(frame.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    cv2.imwrite(str(photo_path), frame)
    return photo_path


def test_video_validation_service():
    """Validates road video admission and rejection logic."""
    road_vid = generate_test_road_video(duration_frames=15, has_pothole=True)
    blank_vid = generate_unrelated_blank_video()
    cartoon_vid = generate_unrelated_cartoon_video()

    try:
        # 1. Road video must be accepted
        is_valid, msg, meta = validate_road_video(road_vid, filename="road.mp4")
        assert is_valid is True, f"Road video was unexpectedly rejected: {msg}"
        assert meta["total_frames"] >= 15
        assert meta["fps"] > 0

        # 2. Blank video must be rejected
        is_valid, msg, _ = validate_road_video(blank_vid, filename="blank.mp4")
        assert is_valid is False
        assert "could not be validated as road surface inspection footage" in msg

        # 3. Cartoon video must be rejected
        is_valid, msg, _ = validate_road_video(cartoon_vid, filename="cartoon.mp4")
        assert is_valid is False
        assert "could not be validated as road surface inspection footage" in msg
    finally:
        road_vid.unlink(missing_ok=True)
        blank_vid.unlink(missing_ok=True)
        cartoon_vid.unlink(missing_ok=True)


def test_opencv_frame_extraction():
    """Validates that OpenCV VideoCapture extracts frames at expected temporal intervals."""
    road_vid = generate_test_road_video(duration_frames=25, has_pothole=True, fps=10.0)
    out_dir = Path(tempfile.mkdtemp())

    try:
        frames = collector_video_processor.extract_frames_with_cv2(
            video_path=road_vid,
            output_dir=out_dir,
            interval_seconds=1.0,
            max_frames=10
        )
        assert len(frames) >= 2, f"Expected multiple extracted frames, got {len(frames)}"
        for t_ms, fpath in frames:
            assert fpath.exists()
            assert t_ms >= 0.0
            # Confirm readable frame
            im = cv2.imread(str(fpath))
            assert im is not None
            assert im.shape[0] == 480 and im.shape[1] == 640
    finally:
        road_vid.unlink(missing_ok=True)
        import shutil
        shutil.rmtree(out_dir, ignore_errors=True)


def test_end_to_end_video_inspection_workflow():
    """
    Executes the full end-to-end live video inspection workflow:
    1. Upload recorded road video to backend.
    2. Extract video frames with OpenCV.
    3. Run YOLOv8 model & computer vision.
    4. Save detection metrics & GPS coordinates.
    5. Snapping to Chandigarh road segment.
    6. Calculate Infrastructure Health Score (IHS).
    7. Storage persistence in database.
    8. Developer review & create repair work order.
    9. Before/after repair photo verification.
    """
    road_vid = generate_test_road_video(duration_frames=20, has_pothole=True)
    report_id = f"RPT-E2E-VID-{os.urandom(4).hex().upper()}"

    try:
        # =====================================================================
        # STEP 1: Upload Video to Backend Storage & Trigger Inspection Workflow
        # =====================================================================
        with open(road_vid, "rb") as f:
            upload_res = client.post(
                "/api/v1/observations/upload-video",
                files={"file": ("road_patrol_dashcam.mp4", f, "video/mp4")},
                data={
                    "vehicle_id": "MOB-CHD-PATROL-01",
                    "latitude": 30.7450,
                    "longitude": 76.7760,
                    "sector": "Sector 17",
                    "report_id": report_id,
                    "captured_at": "2026-10-31T02:00:00Z"
                }
            )

        assert upload_res.status_code == 201, upload_res.text
        data = upload_res.json()
        assert data["success"] is True
        assert data["duplicate"] is False
        summary = data["inspection_summary"]

        # Confirm OpenCV frame extraction occurred
        assert summary["frames_processed"] >= 1
        assert summary["video_url"].startswith("/uploads/videos/")

        # Confirm YOLOv8 / CV road hazard detection
        assert summary["hazards_detected"] >= 1
        obs = data["data"]
        assert obs["observation_id"].startswith("OBS-VID-")
        assert len(obs["detections"]) >= 1
        first_det = obs["detections"][0]
        assert first_det["class_id"] in ["D00", "D10", "D20", "D40"]
        assert 0.0 < first_det["confidence"] <= 1.0
        assert first_det["severity"] in ["critical", "high", "medium", "low"]
        assert len(first_det["bbox"]) == 4

        # Confirm GPS snapping to Chandigarh road segment
        assert obs["matched_road_name"] is not None
        assert obs["linked_segment_id"] is not None

        # Confirm Infrastructure Health Score (IHS) calculation
        assert 5.0 <= summary["health_score"] <= 100.0
        assert summary["risk_level"] in ["critical", "fair", "good"]

        # =====================================================================
        # STEP 2: Duplicate Upload Check (Idempotency)
        # =====================================================================
        with open(road_vid, "rb") as f:
            dup_res = client.post(
                "/api/v1/observations/upload-video",
                files={"file": ("road_patrol_dashcam.mp4", f, "video/mp4")},
                data={
                    "vehicle_id": "MOB-CHD-PATROL-01",
                    "latitude": 30.7450,
                    "longitude": 76.7760,
                    "sector": "Sector 17",
                    "report_id": report_id,
                    "captured_at": "2026-10-31T02:00:00Z"
                }
            )
        assert dup_res.status_code == 200 or dup_res.status_code == 201
        assert dup_res.json()["duplicate"] is True

        # =====================================================================
        # STEP 3: Verify Reports in Observations Listing (Dashboard & GIS Map)
        # =====================================================================
        list_res = client.get("/api/v1/observations")
        assert list_res.status_code == 200
        all_obs = list_res.json()["data"]
        matching_obs = next((o for o in all_obs if o.get("observation_id") == obs["observation_id"]), None)
        assert matching_obs is not None
        assert matching_obs["video_url"] == summary["video_url"]

        # =====================================================================
        # STEP 4: Developer Review & Create Repair Task Work Order
        # =====================================================================
        repair_res = client.post(
            "/api/v1/repairs",
            json={
                "segment_id": obs["linked_segment_id"],
                "observation_id": obs["observation_id"],
                "hazard_type": "Pothole Deep Cavity Resurfacing",
                "priority": "critical",
                "contractor_name": "Shivalik Road Builders & Contractors",
                "estimated_cost_inr": 65000.0,
                "notes": "Emergency pothole repair flagged by mobile video inspection."
            }
        )
        assert repair_res.status_code == 201, repair_res.text
        repair_data = repair_res.json()["data"]
        repair_id = repair_data["repair_id"]
        assert repair_id.startswith("REP-CHD-")
        assert repair_data["status"] == "work_order_issued"
        assert repair_data["before_image_url"] is not None

        # =====================================================================
        # STEP 5: Before / After Repair Photo Verification
        # =====================================================================
        # 5a. Contractor attempts to re-upload identical photo (must be rejected)
        raw_before_img = Path("backend" + obs["annotated_image_url"])
        if not raw_before_img.exists():
            raw_before_img = Path("backend" + obs["image_url"])

        with open(raw_before_img, "rb") as bf:
            ident_res = client.post(
                f"/api/v1/repairs/verify/{repair_id}",
                files={"after_file": ("identical_after.jpg", bf, "image/jpeg")}
            )
        assert ident_res.status_code == 200
        assert ident_res.json()["data"]["damage_cleared"] is False
        assert "identical" in ident_res.json()["data"]["message"].lower()

        # 5b. Contractor uploads authentic repaired road photo (must be verified & closed)
        repaired_photo = generate_repaired_road_photo()
        with open(repaired_photo, "rb") as rf:
            verify_res = client.post(
                f"/api/v1/repairs/verify/{repair_id}",
                files={"after_file": ("fresh_asphalt_after.jpg", rf, "image/jpeg")}
            )
        assert verify_res.status_code == 200
        v_data = verify_res.json()["data"]
        assert v_data["status"] == "verified_closed"
        assert v_data["damage_cleared"] is True
        assert v_data["ai_verification_score"] >= 0.85
        repaired_photo.unlink(missing_ok=True)

        # 5c. Confirm status in repair records listing
        rep_list = client.get("/api/v1/repairs")
        assert rep_list.status_code == 200
        closed_rec = next((r for r in rep_list.json()["data"] if r["repair_id"] == repair_id), None)
        assert closed_rec is not None
        assert closed_rec["status"] == "verified_closed"
        assert closed_rec["after_image_url"] is not None

    finally:
        road_vid.unlink(missing_ok=True)


def test_reject_unrelated_video_upload():
    """Confirms that an unrelated blank video upload is rejected with HTTP 422."""
    blank_vid = generate_unrelated_blank_video()
    try:
        with open(blank_vid, "rb") as f:
            res = client.post(
                "/api/v1/observations/upload-video",
                files={"file": ("blank_test.mp4", f, "video/mp4")},
                data={
                    "vehicle_id": "CITIZEN-MOB",
                    "latitude": 30.7450,
                    "longitude": 76.7760
                }
            )
        assert res.status_code == 422
        assert "could not be validated as road surface inspection footage" in res.json()["detail"]
    finally:
        blank_vid.unlink(missing_ok=True)
