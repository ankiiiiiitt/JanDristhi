import os
import logging
from pathlib import Path
from typing import List, Dict, Any, Tuple

logger = logging.getLogger("jandrishti.ai.processor")

class ImageProcessor:
    """
    Image preprocessing and bounding box visualizer for road surface damage.
    Supports OpenCV (with CLAHE normalization) and Pillow for cross-platform visual rendering.
    """
    def __init__(self):
        self._cv2 = None
        self._init_cv2()

    def _init_cv2(self):
        try:
            import cv2
            self._cv2 = cv2
        except ImportError:
            logger.info("OpenCV not installed in current environment. Using Pillow rendering engine.")

    def preprocess_road_surface(self, image_path: str, output_path: str = None) -> bool:
        """
        Applies CLAHE (Contrast Limited Adaptive Histogram Equalization)
        to normalize shadows, dampness, and bright sunlight on asphalt.
        """
        if self._cv2:
            try:
                img = self._cv2.imread(image_path)
                if img is not None:
                    lab = self._cv2.cvtColor(img, self._cv2.COLOR_BGR2LAB)
                    l, a, b = self._cv2.split(lab)
                    clahe = self._cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
                    cl = clahe.apply(l)
                    limg = self._cv2.merge((cl, a, b))
                    enhanced = self._cv2.cvtColor(limg, self._cv2.COLOR_LAB2BGR)
                    if output_path:
                        self._cv2.imwrite(output_path, enhanced)
                    return True
            except Exception as e:
                logger.error(f"CLAHE preprocessing error: {e}")

        # Fallback using Pillow ImageEnhance
        try:
            from PIL import Image, ImageEnhance
            with Image.open(image_path) as img:
                enhanced = ImageEnhance.Contrast(img).enhance(1.3)
                if output_path:
                    enhanced.save(output_path)
                return True
        except Exception:
            return False

    def draw_detections(self, image_path: str, detections: List[Dict[str, Any]], output_path: str) -> bool:
        """
        Draws high-visibility bounding boxes and labels on the road image.
        Uses Pillow or OpenCV.
        """
        if not Path(image_path).exists():
            return False

        try:
            from PIL import Image, ImageDraw, ImageFont
            with Image.open(image_path) as img:
                img = img.convert("RGB")
                draw = ImageDraw.Draw(img)
                w, h = img.size

                for det in detections:
                    bbox = det.get("bbox", [0, 0, 0, 0])
                    # bbox format: [x1, y1, x2, y2]
                    x1, y1, x2, y2 = bbox
                    # Clamp to image dimensions
                    x1 = max(0, min(w - 1, int(x1)))
                    y1 = max(0, min(h - 1, int(y1)))
                    x2 = max(x1 + 10, min(w, int(x2)))
                    y2 = max(y1 + 10, min(h, int(y2)))

                    severity = det.get("severity", "medium")
                    cls_name = det.get("class_name", "Pothole")
                    cls_id = det.get("class_id", "D00")
                    conf = int(det.get("confidence", 0.85) * 100)
                    label = f"{cls_id}: {cls_name} ({conf}%)"

                    # Color scheme: Red for Critical/Pothole, Orange for High/Alligator, Yellow for Medium/Linear
                    if severity == "critical" or cls_id == "D00":
                        box_color = "#ef4444" # red
                    elif severity == "high" or cls_id == "D10":
                        box_color = "#f97316" # orange
                    else:
                        box_color = "#eab308" # yellow

                    # Draw thick bounding box
                    for offset in range(4):
                        draw.rectangle(
                            [x1 - offset, y1 - offset, x2 + offset, y2 + offset],
                            outline=box_color
                        )

                    # Text banner
                    banner_height = 22
                    draw.rectangle(
                        [x1, max(0, y1 - banner_height), min(w, x1 + len(label) * 9 + 10), y1],
                        fill=box_color
                    )
                    draw.text(
                        (x1 + 4, max(2, y1 - banner_height + 3)),
                        label,
                        fill="#ffffff"
                    )

                img.save(output_path, "JPEG", quality=92)
                return True
        except Exception as e:
            logger.error(f"Pillow drawing failed: {e}")
            if self._cv2:
                # OpenCV fallback
                try:
                    img = self._cv2.imread(image_path)
                    for det in detections:
                        x1, y1, x2, y2 = det.get("bbox", [0, 0, 100, 100])
                        self._cv2.rectangle(img, (int(x1), int(y1)), (int(x2), int(y2)), (0, 0, 255), 3)
                    self._cv2.imwrite(output_path, img)
                    return True
                except Exception:
                    pass

        # Final fallback
        import shutil
        shutil.copyfile(image_path, output_path)
        return True
