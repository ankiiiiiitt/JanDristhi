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

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0

    # Sequential frame extraction (resilient to browser WebM files lacking header cues)
    frames = []
    max_read = 60
    while len(frames) < max_read:
        ret, frame = cap.read()
        if not ret or frame is None:
            break
        frames.append(frame)

    cap.release()

    if len(frames) < 3:
        return False, "Video contains insufficient decodable frames. Please record at least 1-2 seconds of roadway footage.", {}

    fh, fw = frames[0].shape[:2]
    if fw < 100 or fh < 100:
        return False, "Video resolution is too low for reliable defect detection.", {}

    # Sample up to 10 frames evenly across the decoded sequence
    sample_indices = np.linspace(0, len(frames) - 1, min(10, len(frames)), dtype=int)
    selfie_frames = 0
    indoor_frames = 0
    valid_road_frames = 0

    for idx in sample_indices:
        frame = frames[idx]
        h, w = frame.shape[:2]

        # 1. Human skin chrominance test
        ycrcb = cv2.cvtColor(frame, cv2.COLOR_BGR2YCrCb)
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        skin_ycrcb = cv2.inRange(ycrcb, np.array([0, 133, 77]), np.array([255, 173, 127]))
        skin_hsv = cv2.inRange(hsv, np.array([0, 25, 45]), np.array([30, 200, 255]))
        skin_clean = cv2.bitwise_and(skin_ycrcb, skin_hsv)
        skin_ratio = int(np.count_nonzero(skin_clean)) / float(h * w)

        # 2. Indoor tungsten warmth check
        roi_y = int(h * 0.35)
        b_mean = float(np.mean(frame[roi_y:, :, 0]))
        r_mean = float(np.mean(frame[roi_y:, :, 2]))
        br_ratio = b_mean / max(1.0, r_mean)
        is_warm_indoor = (r_mean > 130.0 and br_ratio < 0.58)

        # 3. Road texture
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        road_roi = gray[roi_y:, :]
        lap_var = cv2.Laplacian(road_roi, cv2.CV_64F).var()
        mean_sat = float(np.mean(hsv[roi_y:, :, 1]))
        mean_lum = float(np.mean(road_roi))

        if skin_ratio > 0.08:
            selfie_frames += 1
        elif is_warm_indoor:
            indoor_frames += 1
        elif lap_var >= 12.0 and mean_sat <= 145.0 and 20.0 <= mean_lum <= 220.0:
            valid_road_frames += 1

    total_sampled = len(sample_indices)

    if selfie_frames > 0:
        return False, "Invalid Video: Selfie or portrait detected in video frames. Road inspections require capturing the road surface directly.", {
            "selfie_frames": selfie_frames,
            "total_sampled": total_sampled
        }

    if indoor_frames >= (total_sampled // 2):
        return False, "Invalid Video: Indoor scene detected in inspection footage. Please record an outdoor roadway.", {
            "indoor_frames": indoor_frames,
            "total_sampled": total_sampled
        }

    if valid_road_frames == 0 or (valid_road_frames / total_sampled) < 0.30:
        return False, "Invalid Video: Video footage could not be validated as road surface inspection footage. Please record the road surface directly.", {
            "valid_road_frames": valid_road_frames,
            "total_sampled": total_sampled
        }

    metadata = {
        "total_frames": len(frames),
        "fps": round(fps, 2),
        "duration_seconds": round(len(frames) / max(1.0, fps), 2),
        "width": fw,
        "height": fh,
        "validated_road_frames": valid_road_frames
    }
    return True, "", metadata

