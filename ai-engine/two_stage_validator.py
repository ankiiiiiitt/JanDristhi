"""
Two-Stage Road Image Validation (AI-Engine Interface)
===================================================
Provides direct access to Stage 1 (Road Surface Validation) and
Stage 2 (Damage Detection) within the ai-engine environment.
"""

import sys
from pathlib import Path

# Add backend directory if not in path to access two_stage_validator
backend_dir = Path(__file__).resolve().parent.parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.services.two_stage_validator import (
    Stage1RoadSurfaceValidator,
    Stage2RoadDamageDetector,
    TwoStageRoadPipeline,
    two_stage_pipeline,
    RDD2022_TAXONOMY,
    UNRELATED_COCO_CLASSES,
)

__all__ = [
    "Stage1RoadSurfaceValidator",
    "Stage2RoadDamageDetector",
    "TwoStageRoadPipeline",
    "two_stage_pipeline",
    "RDD2022_TAXONOMY",
    "UNRELATED_COCO_CLASSES",
]

