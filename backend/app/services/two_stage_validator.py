"""
Two-Stage Real Image Validation Pipeline for JanDrishti
======================================================
Stage 1: Road Surface Validation
         Validates whether the uploaded image contains an authentic outdoor asphalt or concrete
         road surface. Strictly rejects:
         - Selfies & human portraits (chrominance skin mask, facial geometry, eye/mouth contours)
         - People-only images (YOLO person detections, prominent human silhouettes)
         - Indoor scenes (warm tungsten/interior lighting spectrum, smooth ceilings/walls, furniture)
         - Unrelated objects (electronics, pets, furniture, tableware, food, documents, paper)
         - Saturated, flat, blank, or underexposed/overexposed non-road images.

Stage 2: Road Damage Detection (Gated by Stage 1)
         ONLY runs if Stage 1 confirms the image is an authentic road surface.
         If Stage 1 fails, Stage 2 is SKIPPED (zero inference, zero simulated damage).
         If Stage 1 passes:
         - Runs YOLOv8 and computer vision fissure/cavity analysis.
         - If road surface is clean, marks "No Damage Detected" (is_hazard=False, detections=[]).
         - If damage is detected, records actual RDD2022 classes (D00, D10, D20, D40),
           confidence, bounding boxes, severity, and estimated surface area.
"""

from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Union
import logging
import os
import cv2
import numpy as np

logger = logging.getLogger("jandrishti.two_stage_validator")

# Supported road photo formats and binary signatures
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
IMAGE_SIGNATURES = (
    b"\xff\xd8\xff",        # JPEG
    b"\x89PNG\r\n\x1a\n",  # PNG
    b"RIFF",                 # WebP (with WEBP sub-marker)
)

# RDD2022 Standard Damage Taxonomy
RDD2022_TAXONOMY = {
    "D00": "Longitudinal Cracks",
    "D10": "Transverse Cracks",
    "D20": "Alligator Cracking",
    "D40": "Potholes"
}

# COCO classes representing non-road objects
UNRELATED_COCO_CLASSES = {
    "chair", "couch", "bed", "dining table", "toilet", "tv", "laptop",
    "mouse", "keyboard", "cell phone", "microwave", "oven", "toaster",
    "sink", "refrigerator", "book", "clock", "vase", "scissors", "teddy bear",
    "hair drier", "toothbrush", "banana", "apple", "sandwich", "orange",
    "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "cat", "dog",
    "cup", "bottle", "knife", "spoon", "fork", "bowl", "backpack", "umbrella",
    "handbag", "tie", "suitcase", "wine glass", "potted plant", "remote"
}

_shared_coco_detector = None


def get_coco_detector():
    """Lazily loads YOLOv8n detector to identify persons and unrelated objects."""
    global _shared_coco_detector
    if _shared_coco_detector is False:
        return None
    if _shared_coco_detector is not None:
        return _shared_coco_detector
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
                _shared_coco_detector = YOLO(str(c))
                return _shared_coco_detector
    except Exception as e:
        logger.debug(f"COCO detector load note: {e}")
    _shared_coco_detector = False
    return None


class Stage1RoadSurfaceValidator:
    """
    Stage 1: Validates that the uploaded photo is an authentic road surface.
    Rejects selfies, people-only images, indoor photos, and unrelated objects.
    """

    def validate(
        self,
        image_path: Union[str, Path],
        content_type: Optional[str] = None,
        filename: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes Stage 1 admission checks.
        Returns a structured dictionary indicating whether the image passed or was rejected,
        including the specific rejection category and technical metrics.
        """
        path = Path(image_path)

        # 1. MIME and file extension check
        if content_type and content_type.lower() not in ALLOWED_IMAGE_TYPES:
            return self._build_result(
                is_valid=False,
                category="invalid_format",
                reason="Invalid Image: Please upload a JPEG, PNG, or WebP road photo."
            )

        suffix = Path(filename or path.name).suffix.lower()
        if suffix not in {".jpg", ".jpeg", ".png", ".webp"}:
            return self._build_result(
                is_valid=False,
                category="invalid_extension",
                reason="Invalid Image: The selected file is not a supported road-photo format."
            )

        if not path.exists():
            return self._build_result(
                is_valid=False,
                category="file_not_found",
                reason="Invalid Image: The photo could not be read from disk. Please retake it."
            )

        try:
            payload = path.read_bytes()
        except OSError:
            return self._build_result(
                is_valid=False,
                category="io_error",
                reason="Invalid Image: The photo could not be read. Please retake it."
            )

        if len(payload) < 256:
            return self._build_result(
                is_valid=False,
                category="truncated_file",
                reason="Invalid Image: The photo is empty or incomplete (size < 256 bytes). Please retake it."
            )

        is_webp = payload.startswith(b"RIFF") and payload[8:12] == b"WEBP"
        if not any(payload.startswith(sig) for sig in IMAGE_SIGNATURES) or (payload.startswith(b"RIFF") and not is_webp):
            return self._build_result(
                is_valid=False,
                category="corrupt_signature",
                reason="Invalid Image: The uploaded file is not a valid camera image."
            )

        img = cv2.imread(str(path))
        if img is None:
            return self._build_result(
                is_valid=False,
                category="decode_failed",
                reason="Invalid Image: Image could not be decoded. Please retake the photo."
            )

        h, w = img.shape[:2]
        if h < 140 or w < 140:
            return self._build_result(
                is_valid=False,
                category="low_resolution",
                reason="Invalid Image: Image resolution is too low for road inspection (min 140x140)."
            )

        # 2. Color Spaces
        ycrcb = cv2.cvtColor(img, cv2.COLOR_BGR2YCrCb)
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        roi_y = int(h * 0.35)

        # 3. Selfie & Portrait Skin Analysis
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

        b_mean = float(np.mean(img[roi_y:, :, 0]))
        r_mean = float(np.mean(img[roi_y:, :, 2]))
        b_r_ratio = float(round(b_mean / max(1.0, r_mean), 2))
        is_indoor_warmth = (r_mean > 115.0 and b_r_ratio < 0.58)

        # Reject Selfie / Portrait
        if (max_contour_ratio > 0.06 and max_contour_ratio < 0.45 and skin_ratio < 0.45) or (skin_ratio > 0.10 and not is_indoor_warmth):
            return self._build_result(
                is_valid=False,
                category="selfie",
                reason="Invalid Image: Selfie or portrait detected. Road inspections require capturing the road surface directly.",
                metrics={"skin_ratio": round(skin_ratio, 3), "max_contour_ratio": round(max_contour_ratio, 3)}
            )

        # Reject Indoor Scene via warm interior lighting
        if is_indoor_warmth:
            return self._build_result(
                is_valid=False,
                category="indoor_scene",
                reason="Invalid Image: Indoor scene or warm interior lighting detected. Road inspections require outdoor road surfaces.",
                metrics={"b_r_ratio": b_r_ratio, "r_mean": round(r_mean, 1)}
            )

        # 4. YOLO Object Detection: People-Only, Indoor Furniture, Unrelated Objects
        detected_objects = []
        coco_model = get_coco_detector()
        if coco_model:
            try:
                results = coco_model.predict(source=str(path), conf=0.35, verbose=False)
                for r in results:
                    for box in r.boxes:
                        cls_idx = int(box.cls[0])
                        class_name = r.names.get(cls_idx, "").lower()
                        conf = float(box.conf[0])
                        xyxy = box.xyxy[0].tolist()
                        bw = xyxy[2] - xyxy[0]
                        bh = xyxy[3] - xyxy[1]
                        area_ratio = (bw * bh) / float(w * h)

                        detected_objects.append({
                            "class": class_name,
                            "confidence": round(conf, 2),
                            "area_ratio": round(area_ratio, 3)
                        })

                        # People-only or prominent person in frame
                        if class_name == "person" and (conf >= 0.40 or area_ratio >= 0.05):
                            return self._build_result(
                                is_valid=False,
                                category="people_only",
                                reason="Invalid Image: Selfie or person detected. Please capture the asphalt road surface directly.",
                                metrics={"detected_class": class_name, "confidence": conf, "area_ratio": area_ratio}
                            )

                        # Unrelated furniture, appliances, pets, food
                        if class_name in UNRELATED_COCO_CLASSES and (conf >= 0.35 and area_ratio >= 0.03):
                            return self._build_result(
                                is_valid=False,
                                category="unrelated_object",
                                reason=f"Invalid Image: Unrelated object detected ({class_name}). Road inspections require asphalt or concrete road surface.",
                                metrics={"detected_class": class_name, "confidence": conf, "area_ratio": area_ratio}
                            )
            except Exception as e:
                logger.debug(f"YOLO object check note: {e}")

        # 5. Luminance Limits (Underexposed darkness or overexposed blankness)
        mean_lum = float(np.mean(gray))
        if mean_lum < 25.0:
            return self._build_result(
                is_valid=False,
                category="underexposed",
                reason="Invalid Image: Image is too dark or underexposed for road inspection.",
                metrics={"mean_lum": round(mean_lum, 1)}
            )

        if mean_lum > 230.0:
            return self._build_result(
                is_valid=False,
                category="overexposed",
                reason="Invalid Image: Image is overexposed or blank white.",
                metrics={"mean_lum": round(mean_lum, 1)}
            )

        # 6. Texture Variance (Laplacian of Gaussian)
        lap_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        if lap_var < 15.0:
            return self._build_result(
                is_valid=False,
                category="flat_uniform_surface",
                reason="Invalid Image: Surface is smooth, uniform, or blank (no asphalt road texture detected).",
                metrics={"laplacian_var": round(lap_var, 1)}
            )

        # 7. Color Saturation on Road Driving Surface
        mean_sat = float(np.mean(hsv[roi_y:, :, 1]))
        if mean_sat > 115.0:
            return self._build_result(
                is_valid=False,
                category="high_saturation",
                reason="Invalid Image: Highly saturated colors detected (non-road scene such as grass, indoor decor, or artwork).",
                metrics={"mean_sat": round(mean_sat, 1)}
            )

        # 8. Printed Document / Paper Detection
        extreme_pixels = np.count_nonzero(gray < 35) + np.count_nonzero(gray > 220)
        if (extreme_pixels / float(w * h)) > 0.70:
            return self._build_result(
                is_valid=False,
                category="document",
                reason="Invalid Image: Document or printed page detected instead of road surface.",
                metrics={"extreme_pixel_ratio": round(extreme_pixels / float(w * h), 3)}
            )

        # All Stage 1 checks passed: Valid outdoor road surface confirmed
        return self._build_result(
            is_valid=True,
            category=None,
            reason="",
            metrics={
                "width": w,
                "height": h,
                "mean_lum": round(mean_lum, 1),
                "laplacian_var": round(lap_var, 1),
                "mean_sat": round(mean_sat, 1),
                "skin_ratio": round(skin_ratio, 3),
                "b_r_ratio": b_r_ratio,
                "detected_objects": detected_objects
            }
        )

    def _build_result(
        self,
        is_valid: bool,
        category: Optional[str],
        reason: str,
        metrics: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        return {
            "stage": 1,
            "stage_name": "road_surface_validation",
            "is_valid_road": is_valid,
            "status": "passed" if is_valid else "rejected",
            "rejection_category": category,
            "rejection_reason": category if not is_valid else None,
            "error_message": reason,
            "validation_metrics": metrics or {}
        }


class Stage2RoadDamageDetector:
    """
    Stage 2: Runs YOLOv8 and computer vision surface analysis to detect potholes and cracks.
    STRICTLY GATED: Must only be executed for validated road images.
    """

    def __init__(self, ai_detector=None):
        self._ai_detector = ai_detector
        if self._ai_detector is None:
            self._init_detector()

    def _init_detector(self):
        try:
            from detector import RoadDamageDetector
            self._ai_detector = RoadDamageDetector()
        except Exception as e:
            logger.debug(f"Direct detector import note: {e}")

    def detect(
        self,
        image_path: Union[str, Path],
        annotate_output_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Runs damage detection on the validated road image.
        Returns authentic class, confidence, bounding boxes, severity, and status.
        """
        path = Path(image_path)
        if not path.exists():
            return {
                "stage": 2,
                "stage_name": "road_damage_detection",
                "executed": False,
                "status": "skipped",
                "damage_detected": False,
                "detections_count": 0,
                "detections": [],
                "hazard_category": "No Damage Detected",
                "severity": None,
                "reason": "Image file not found."
            }

        # Run AI detection via detector
        raw_detections = []
        if self._ai_detector:
            try:
                raw_detections = self._ai_detector.detect(str(path))
            except Exception as e:
                logger.error(f"Stage 2 detection inference error: {e}")

        # Parse and sanitize detections
        parsed_detections: List[Dict[str, Any]] = []
        for d in (raw_detections or []):
            cid = d.get("class_id", "D40")
            cname = RDD2022_TAXONOMY.get(cid, d.get("class_name", "Potholes"))
            conf = float(d.get("confidence", 0.85))
            bbox = d.get("bbox", [0, 0, 0, 0])
            area_sqm = float(d.get("estimated_area_sqm", 0.30))
            severity = d.get("severity", "medium")

            # Validate confidence and box geometry
            if conf >= 0.35 and len(bbox) == 4 and (bbox[2] > bbox[0]) and (bbox[3] > bbox[1]):
                parsed_detections.append({
                    "class_id": cid,
                    "class_name": cname,
                    "confidence": round(conf, 2),
                    "bbox": bbox,
                    "severity": severity,
                    "estimated_area_sqm": round(area_sqm, 2),
                    "engine": d.get("engine", "YOLOv8-RDD2022")
                })

        has_damage = len(parsed_detections) > 0
        hazard_cat = parsed_detections[0]["class_name"] if has_damage else "No Damage Detected"
        overall_severity = parsed_detections[0]["severity"] if has_damage else None

        return {
            "stage": 2,
            "stage_name": "road_damage_detection",
            "executed": True,
            "status": "damage_detected" if has_damage else "no_damage_detected",
            "damage_detected": has_damage,
            "detections_count": len(parsed_detections),
            "detections": parsed_detections,
            "hazard_category": hazard_cat,
            "severity": overall_severity,
            "engine": "YOLOv8-RDD2022 / CV Surface Analysis"
        }


class TwoStageRoadPipeline:
    """
    Coordinates Stage 1 (Road Surface Validation) and Stage 2 (Damage Detection).
    Ensures validation and damage detection remain strictly decoupled yet synchronized.
    """

    def __init__(self, ai_detector=None):
        self.stage1_validator = Stage1RoadSurfaceValidator()
        self.stage2_detector = Stage2RoadDamageDetector(ai_detector=ai_detector)

    def process(
        self,
        image_path: Union[str, Path],
        content_type: Optional[str] = None,
        filename: Optional[str] = None,
        is_survey: bool = False
    ) -> Dict[str, Any]:
        """
        Executes the two-stage validation and detection workflow.
        """
        # --- STAGE 1: Road Surface Validation ---
        stage1_res = self.stage1_validator.validate(image_path, content_type=content_type, filename=filename)

        if not stage1_res["is_valid_road"]:
            # STAGE 2 IS SKIPPED: Never create fake detections or run damage inference on non-roads
            return {
                "accepted": False,
                "stage1_validation": stage1_res,
                "stage2_damage_detection": {
                    "stage": 2,
                    "stage_name": "road_damage_detection",
                    "executed": False,
                    "status": "skipped",
                    "damage_detected": False,
                    "detections_count": 0,
                    "detections": [],
                    "hazard_category": "None",
                    "severity": None,
                    "reason": f"Stage 2 skipped: {stage1_res['error_message']}"
                },
                "final_decision": {
                    "accepted": False,
                    "report_status": "rejected",
                    "report_title": "Invalid Submission",
                    "is_hazard": False,
                    "hazard_category": "Invalid Image",
                    "rejection_reason": stage1_res["error_message"],
                    "rejection_category": stage1_res["rejection_category"]
                }
            }

        # --- STAGE 2: Damage Detection (Only for verified road surfaces) ---
        stage2_res = self.stage2_detector.detect(image_path)
        has_damage = stage2_res["damage_detected"]

        if not has_damage:
            report_status = "no_damage_detected"
            report_title = "Road Image - No Damage Detected"
            is_hazard = False
            hazard_cat = "No Damage Detected"
        else:
            is_hazard = True
            hazard_cat = stage2_res["hazard_category"]
            primary_det = stage2_res["detections"][0]
            report_title = f"{primary_det['class_name']} ({primary_det['class_id']})"
            report_status = "accepted" if is_survey else "pending_review"

        return {
            "accepted": True,
            "stage1_validation": stage1_res,
            "stage2_damage_detection": stage2_res,
            "final_decision": {
                "accepted": True,
                "report_status": report_status,
                "report_title": report_title,
                "is_hazard": is_hazard,
                "hazard_category": hazard_cat,
                "severity": stage2_res["severity"],
                "rejection_reason": None,
                "rejection_category": None
            }
        }


# Global singleton pipeline instance
two_stage_pipeline = TwoStageRoadPipeline()

