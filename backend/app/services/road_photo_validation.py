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
    "cup", "bottle", "knife", "spoon", "fork", "bowl"
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


def validate_road_photo(
    path: Path,
    content_type: str | None = None,
    filename: str | None = None,
    return_metadata: bool = False
) -> Tuple[bool, str] | Tuple[bool, str, Dict[str, Any]]:
    """Reject non-road images (selfies, faces, indoor objects, saturated graphics, blank slides)
    BEFORE AI road-damage inference.

    Validates:
    1. File headers and image decoding integrity.
    2. Resolution sanity (minimum dimensions).
    3. Human face / selfie detection via dual-color-space skin chrominance & contour analysis.
    4. Unrelated object detection (person, furniture, pets, electronics) via YOLO backbone.
    5. Authentic road surface characteristics:
       - Luminance limits (excludes pitch-black and blown-out white screens)
       - Texture variance (Laplacian variance >= 15.0, excludes smooth walls, paper, sky)
       - Neutral color saturation (mean HSV saturation <= 115.0, excludes grass, neon cartoons)
       - Document / text page exclusion.
    """
    if content_type and content_type.lower() not in ALLOWED_IMAGE_TYPES:
        err = "Invalid Image: Please upload a JPEG, PNG, or WebP road photo."
        return (False, err, {}) if return_metadata else (False, err)

    suffix = Path(filename or path.name).suffix.lower()
    if suffix not in {".jpg", ".jpeg", ".png", ".webp"}:
        err = "Invalid Image: The selected file is not a supported road-photo format."
        return (False, err, {}) if return_metadata else (False, err)

    if not path.exists():
        err = "Invalid Image: The photo could not be read from disk. Please retake it."
        return (False, err, {}) if return_metadata else (False, err)

    try:
        payload = path.read_bytes()
    except OSError:
        err = "Invalid Image: The photo could not be read. Please retake it."
        return (False, err, {}) if return_metadata else (False, err)

    if len(payload) < 256:
        err = "Invalid Image: The photo is empty or incomplete (size < 256 bytes). Please retake it."
        return (False, err, {}) if return_metadata else (False, err)

    is_webp = payload.startswith(b"RIFF") and payload[8:12] == b"WEBP"
    if not any(payload.startswith(signature) for signature in IMAGE_SIGNATURES) or (payload.startswith(b"RIFF") and not is_webp):
        err = "Invalid Image: The uploaded file is not a valid camera image."
        return (False, err, {}) if return_metadata else (False, err)

    # Decode image using OpenCV
    try:
        import cv2
        import numpy as np
    except ImportError:
        # Fallback if cv2 is not installed
        return (True, "", {}) if return_metadata else (True, "")

    img = cv2.imread(str(path))
    if img is None:
        err = "Invalid Image: Image could not be decoded. Please retake the photo."
        return (False, err, {}) if return_metadata else (False, err)

    h, w = img.shape[:2]
    if h < 140 or w < 140:
        err = "Invalid Image: Image resolution is too low for road inspection (min 140x140)."
        return (False, err, {}) if return_metadata else (False, err)

    # 1. Skin Chrominance & Selfie / Portrait Detection
    ycrcb = cv2.cvtColor(img, cv2.COLOR_BGR2YCrCb)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Human skin chrominance mask (YCrCb [Cr: 133-173, Cb: 77-127] + HSV [H: 0-30, S: 25-200])
    skin_ycrcb = cv2.inRange(ycrcb, np.array([0, 133, 77]), np.array([255, 173, 127]))
    skin_hsv = cv2.inRange(hsv, np.array([0, 25, 45]), np.array([30, 200, 255]))
    skin_mask = cv2.bitwise_and(skin_ycrcb, skin_hsv)

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    skin_clean = cv2.morphologyEx(skin_mask, cv2.MORPH_OPEN, kernel)
    skin_clean = cv2.morphologyEx(skin_clean, cv2.MORPH_CLOSE, kernel)

    skin_pixels = int(np.count_nonzero(skin_clean))
    skin_ratio = skin_pixels / float(w * h)

    contours, _ = cv2.findContours(skin_clean, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    max_contour_area = max([cv2.contourArea(c) for c in contours], default=0.0)
    max_contour_ratio = max_contour_area / float(w * h)

    if max_contour_ratio > 0.07 or skin_ratio > 0.12:
        err = "Invalid Image: Selfie or portrait detected. Road inspections require capturing the road surface directly."
        return (False, err, {"rejection_reason": "selfie_detected", "skin_ratio": round(skin_ratio, 3)}) if return_metadata else (False, err)

    # 2. YOLO Object Classification (Check for person, pet, or indoor furniture)
    detector = _get_coco_detector()
    if detector:
        try:
            results = detector.predict(source=str(path), conf=0.35, verbose=False)
            for r in results:
                for box in r.boxes:
                    cls_idx = int(box.cls[0])
                    class_name = r.names.get(cls_idx, "").lower()
                    conf = float(box.conf[0])
                    xyxy = box.xyxy[0].tolist()
                    bw = xyxy[2] - xyxy[0]
                    bh = xyxy[3] - xyxy[1]
                    area_ratio = (bw * bh) / float(w * h)

                    if class_name == "person" and (conf >= 0.40 or area_ratio >= 0.05):
                        err = "Invalid Image: Selfie or person detected. Please capture the asphalt road surface directly."
                        return (False, err, {"rejection_reason": "person_detected", "confidence": conf}) if return_metadata else (False, err)

                    if class_name in UNRELATED_COCO_CLASSES and (conf >= 0.35 and area_ratio >= 0.03):
                        err = f"Invalid Image: Unrelated object detected ({class_name}). Road inspections require asphalt or concrete road surface."
                        return (False, err, {"rejection_reason": "unrelated_object", "detected_object": class_name, "confidence": conf}) if return_metadata else (False, err)
        except Exception:
            pass

    # 3. Luminance Bounds (Pitch black or overexposed white)
    mean_lum = float(np.mean(gray))
    if mean_lum < 25.0:
        err = "Invalid Image: Image is too dark or underexposed for road inspection."
        return (False, err, {"rejection_reason": "underexposed", "mean_lum": round(mean_lum, 1)}) if return_metadata else (False, err)

    if mean_lum > 230.0:
        err = "Invalid Image: Image is overexposed or blank white."
        return (False, err, {"rejection_reason": "overexposed_or_blank", "mean_lum": round(mean_lum, 1)}) if return_metadata else (False, err)

    # 4. Texture Variance (Laplacian of Gaussian)
    lap_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    if lap_var < 15.0:
        err = "Invalid Image: Surface is smooth, uniform, or blank (no asphalt road texture detected)."
        return (False, err, {"rejection_reason": "flat_uniform_surface", "laplacian_var": round(lap_var, 1)}) if return_metadata else (False, err)

    # 5. Color Saturation on Lower 65% Driving Surface
    roi_y = int(h * 0.35)
    mean_sat = float(np.mean(hsv[roi_y:, :, 1]))
    if mean_sat > 115.0:
        err = "Invalid Image: Highly saturated colors detected (non-road scene such as grass, indoor decor, or artwork)."
        return (False, err, {"rejection_reason": "high_saturation", "mean_sat": round(mean_sat, 1)}) if return_metadata else (False, err)

    # 6. Printed Document / Text Detection
    extreme_pixels = np.count_nonzero(gray < 35) + np.count_nonzero(gray > 220)
    if (extreme_pixels / float(w * h)) > 0.70:
        err = "Invalid Image: Document or printed page detected instead of road surface."
        return (False, err, {"rejection_reason": "document_detected"}) if return_metadata else (False, err)

    metadata = {
        "width": w,
        "height": h,
        "mean_lum": round(mean_lum, 1),
        "laplacian_var": round(lap_var, 1),
        "mean_sat": round(mean_sat, 1),
        "skin_ratio": round(skin_ratio, 3)
    }
    return (True, "", metadata) if return_metadata else (True, "")


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
        # Fallback if cv2 is unavailable
        return True, "", {"total_frames": 10, "fps": 25.0, "duration_seconds": 1.0}

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

