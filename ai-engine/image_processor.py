import os
import logging
from pathlib import Path
from typing import List, Dict, Any, Tuple

logger = logging.getLogger("jandrishti.ai.processor")

class ImageProcessor:
    """
    OpenCV-based image preprocessing and bounding box visualizer for road surfaces.
    """
    def __init__(self):
        self._cv2 = None
        self._init_cv2()

    def _init_cv2(self):
        try:
            import cv2
            self._cv2 = cv2
        except ImportError:
            logger.info("OpenCV not installed in current environment. ImageProcessor running in headless mode.")

    def preprocess_road_surface(self, image_path: str, output_path: str = None) -> bool:
        """
        Applies CLAHE (Contrast Limited Adaptive Histogram Equalization)
        to normalize shadows, dampness, and bright sunlight on asphalt.
        """
        if not self._cv2:
            return False

        try:
            img = self._cv2.imread(image_path)
            if img is None:
                return False

            # Convert to LAB color space
            lab = self._cv2.cvtColor(img, self._cv2.COLOR_BGR2LAB)
            l, a, b = self._cv2.split(lab)

            # Apply CLAHE to L channel
            clahe = self._cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
            cl = clahe.apply(l)

            # Merge back
            limg = self._cv2.merge((cl, a, b))
            enhanced = self._cv2.cvtColor(limg, self._cv2.COLOR_LAB2BGR)

            if output_path:
                self._cv2.imwrite(output_path, enhanced)
            return True
        except Exception as e:
            logger.error(f"Preprocessing error: {e}")
            return False

    def draw_detections(self, image_path: str, detections: List[Dict[str, Any]], output_path: str) -> bool:
        """Draws bounding boxes and labels on the image for human audit."""
        if not self._cv2:
            # Fallback: Copy file
            try:
                import shutil
                shutil.copyfile(image_path, output_path)
                return True
            except Exception:
                return False

        try:
            img = self._cv2.imread(image_path)
            if img is None:
                return False

            for det in detections:
                bbox = det.get("bbox", [0, 0, 0, 0])
                label = f"{det.get('class_name', 'Damage')} ({int(det.get('confidence', 0)*100)}%)"
                severity = det.get("severity", "medium")

                # Color: BGR format (Red for critical, Orange for high, Yellow for medium)
                color = (0, 0, 255) if severity == "critical" else (0, 165, 255) if severity == "high" else (0, 255, 255)

                x1, y1, x2, y2 = bbox[0], bbox[1], bbox[2], bbox[3]
                self._cv2.rectangle(img, (x1, y1), (x2, y2), color, 3)

                # Label background box
                (w, h), _ = self._cv2.getTextSize(label, self._cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
                self._cv2.rectangle(img, (x1, y1 - 25), (x1 + w + 10, y1), color, -1)
                self._cv2.putText(img, label, (x1 + 5, y1 - 7), self._cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

            self._cv2.imwrite(output_path, img)
            return True
        except Exception as e:
            logger.error(f"Failed to draw detections: {e}")
            return False
