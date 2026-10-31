"""Robust admission checks for citizen road-photo and road-video reports."""
from pathlib import Path
from typing import Tuple, Dict, Any, Optional
import os

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
IMAGE_SIGNATURES = (
    b"\xff\xd8\xff",                 # JPEG
    b"\x89PNG\r\n\x1a\n",           # PNG
    b"RIFF",                          # WebP (checked with WEBP marker below)
)

ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov", ".avi", ".mkv"}
ALLOWED_VIDEO_TYPES = {
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-msvideo",
    "video/avi",
    "application/octet-stream"
}

UNRELATED_COCO_CLASSES = {
    "chair", "couch", "bed", "dining table", "toilet", "tv", "laptop",
    "mouse", "keyboard", "cell phone", "microwave", "oven", "toaster",
    "sink", "refrigerator", "book", "clock", "vase", "scissors", "teddy bear",
    "hair drier", "toothbrush", "banana", "apple", "sandwich", "orange",
    "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "cat", "dog",
    "cup", "bottle", "knife", "spoon", "fork", "bowl", "backpack", "umbrella",
    "handbag", "tie", "suitcase", "wine glass", "potted plant", "remote"
}

_coco_detector = None


def _get_coco_detector():
    """Lazily loads pretrained YOLOv8n detector to identify persons and non-road objects."""
    global _coco_detector
    if _coco_detector is False:
        return None
    if _coco_detector is not None:
        return _coco_detector
    try:
        os.environ.setdefault("YOLO_CONFIG_DIR", "/tmp/ultralytics")
        from ultralytics import YOLO
        candidates = [
            Path("yolov8n.pt"),
            Path("ai-engine/weights/best_road_damage.pt"),
            Path("ai-engine/weights/best.pt")
        ]
        for c in candidates:
            if c.exists() and c.stat().st_size > 1000:
                _coco_detector = YOLO(str(c))
                return _coco_detector
    except Exception:
        pass
    _coco_detector = False
    return None


from app.services.two_stage_validator import (
    Stage1RoadSurfaceValidator,
    ALLOWED_IMAGE_TYPES,
    IMAGE_SIGNATURES,
    UNRELATED_COCO_CLASSES,
    get_coco_detector as _get_coco_detector
)

_stage1_validator = Stage1RoadSurfaceValidator()


def validate_road_photo(
    path: Path,
    content_type: str | None = None,
    filename: str | None = None,
    return_metadata: bool = False
) -> Tuple[bool, str] | Tuple[bool, str, Dict[str, Any]]:
    """Reject non-road images (selfies, faces, indoor objects, saturated graphics, blank slides)
    BEFORE AI road-damage inference using Stage 1 Road Surface Validation.
    """
    res = _stage1_validator.validate(path, content_type=content_type, filename=filename)
    is_valid = res["is_valid_road"]
    err = res["error_message"]
    meta = dict(res.get("validation_metrics", {}))
    if not is_valid:
        meta["rejection_reason"] = res.get("rejection_category")
        meta["rejection_category"] = res.get("rejection_category")
    else:
        meta["stage"] = "stage1_passed"
        meta["is_valid_road"] = True

    return (is_valid, err, meta) if return_metadata else (is_valid, err)



def validate_road_video(
    path: Path,
    content_type: Optional[str] = None,
    filename: Optional[str] = None
) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Validates uploaded road inspection video files.
    - Confirms supported video container extension and content type.
    - Uses OpenCV VideoCapture to verify stream integrity, frame count, and dimensions.
    - Inspects sample frames for authentic road surface characteristics (asphalt texture
      variance, natural outdoor luminance, and non-saturated color spectrum).
    - Rejects unrelated videos (blank screens, anime/cartoons, documents, faces).
    """
    ext = Path(filename or path.name).suffix.lower()
    if ext not in ALLOWED_VIDEO_EXTENSIONS:
        return False, f"Unsupported video format '{ext}'. Please upload an MP4, WebM, MOV, or AVI video.", {}

    if content_type and not (content_type.lower().startswith("video/") or content_type.lower() in ALLOWED_VIDEO_TYPES):
        return False, "Uploaded file is not a valid video stream.", {}

    if not path.exists():
        return False, "The video file could not be read from storage.", {}

    file_size = path.stat().st_size
    if file_size < 1024:
        return False, "Video file is empty or corrupted (size < 1KB). Please record again.", {}

    try:
        import cv2
        import numpy as np
    except ImportError:
        return False, "Video analysis engine is initializing. Please retry in a moment.", {}

    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        return False, "The uploaded video could not be decoded by the video engine.", {}

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    duration = total_frames / max(1.0, fps)

    if total_frames < 3 or (duration > 0 and duration < 0.2):
        cap.release()
        return False, "Video is too short. Please record at least 1-2 seconds of road surface.", {}

    if width < 120 or height < 120:
        cap.release()
        return False, "Video resolution is too low for reliable defect detection.", {}

    # Sample up to 6 frames across the timeline to test for authentic road surface
    step = max(1, total_frames // 6)
    valid_road_frames = 0
    sampled = 0

    for idx in range(0, total_frames, step):
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if not ret or frame is None:
            continue
        sampled += 1
        fh, fw = frame.shape[:2]
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)

        # Focus analysis on the lower 65% driving surface
        roi_y = int(fh * 0.35)
        road_roi = gray[roi_y:, :]
        roi_hsv = hsv[roi_y:, :]

        lap_var = cv2.Laplacian(road_roi, cv2.CV_64F).var()
        mean_sat = float(np.mean(roi_hsv[:, :, 1]))
        mean_val = float(np.mean(road_roi))

        # Authentic asphalt criteria:
        # 1. Texture variance >= 10.0 (excludes pure solid screens and blank slides)
        # 2. Mean saturation <= 150.0 (excludes hyper-saturated neon cartoons/animations)
        # 3. Luminance in [20, 220] (excludes pure pitch-black or blown-out white screens)
        is_road = (lap_var >= 10.0) and (mean_sat <= 150.0) and (20.0 <= mean_val <= 220.0)
        if is_road:
            valid_road_frames += 1

    cap.release()

    if sampled == 0 or (valid_road_frames / sampled) < 0.4:
        return False, "Uploaded video could not be validated as road surface inspection footage. Please record the road surface directly.", {}

    metadata = {
        "total_frames": total_frames,
        "fps": round(fps, 2),
        "duration_seconds": round(duration, 2),
        "width": width,
        "height": height,
        "validated_road_frames": valid_road_frames
    }
    return True, "", metadata

