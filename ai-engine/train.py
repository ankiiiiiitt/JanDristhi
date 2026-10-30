#!/usr/bin/env python3
"""
YOLOv8n Fine-Tuning Pipeline for Road Damage Detection (RDD2022)
================================================================
Fine-tunes a pretrained YOLOv8n (nano) backbone on the RDD2022 dataset for
four standard road damage classes:
  - 0: D00 (Potholes)
  - 1: D10 (Alligator Cracking)
  - 2: D20 (Longitudinal Cracks)
  - 3: D40 (Transverse Cracks)

Configuration:
  - Base Model: yolov8n.pt (Pretrained weights)
  - Image Size: 640x640
  - Epochs: 100
  - Checkpoint: Automatically preserves and copies best.pt to ai-engine/weights/best_road_damage.pt
  - Device: Auto-selects Apple Silicon MPS (Metal Performance Shaders), CUDA, or CPU
"""

import os
import sys
import shutil
import argparse
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("jandrishti.ai.train")


def resolve_compute_device(device_arg: str = None) -> str:
    """Detects available acceleration hardware (MPS for Mac Apple Silicon, CUDA for NVIDIA, or CPU)."""
    if device_arg:
        return device_arg

    try:
        import torch
        if torch.cuda.is_available():
            logger.info(f"Using NVIDIA CUDA acceleration ({torch.cuda.get_device_name(0)})")
            return "0"
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            logger.info("Using Apple Silicon Metal Performance Shaders (MPS)")
            return "mps"
    except ImportError:
        pass

    logger.info("Using standard CPU compute")
    return "cpu"


def train_yolov8n(
    data_yaml: Path,
    epochs: int = 100,
    imgsz: int = 640,
    batch_size: int = 16,
    pretrained_weights: str = "yolov8n.pt",
    output_weights_path: Path = Path("ai-engine/weights/best_road_damage.pt"),
    project_dir: Path = Path("ai-engine/runs"),
    experiment_name: str = "rdd2022_yolov8n",
    device: str = None,
    workers: int = 4,
    patience: int = 20
) -> Path:
    """
    Executes fine-tuning of YOLOv8n on RDD2022 dataset and copies best.pt to target weights directory.
    """
    try:
        from ultralytics import YOLO
    except ImportError:
        logger.error(
            "Ultralytics is not installed in the active environment.\n"
            "Install training dependencies via: pip install ultralytics torch torchvision"
        )
        sys.exit(1)

    if not data_yaml.exists():
        logger.error(f"Dataset configuration file not found at: {data_yaml}")
        sys.exit(1)

    device = resolve_compute_device(device)

    logger.info(f"Initializing YOLOv8n from pretrained weights: {pretrained_weights}")
    model = YOLO(pretrained_weights)

    logger.info("=" * 60)
    logger.info(f"Starting YOLOv8n Fine-Tuning:")
    logger.info(f"  Dataset Config: {data_yaml.resolve()}")
    logger.info(f"  Epochs:         {epochs}")
    logger.info(f"  Image Size:     {imgsz}x{imgsz}")
    logger.info(f"  Batch Size:     {batch_size}")
    logger.info(f"  Compute Device: {device}")
    logger.info(f"  Patience:       {patience}")
    logger.info(f"  Target Best:    {output_weights_path.resolve()}")
    logger.info("=" * 60)

    # Launch Ultralytics training
    results = model.train(
        data=str(data_yaml.resolve()),
        epochs=epochs,
        imgsz=imgsz,
        batch=batch_size,
        device=device,
        project=str(project_dir),
        name=experiment_name,
        workers=workers,
        patience=patience,
        save=True,
        save_period=-1,  # Saves best.pt and last.pt automatically
        exist_ok=True,
        pretrained=True,
        optimizer="AdamW",
        lr0=0.001,
        lrf=0.01,
        box=7.5,
        cls=0.5,
        dfl=1.5,
        plots=True,
        verbose=True
    )

    # Locate and preserve best.pt
    run_best_checkpoint = project_dir / experiment_name / "weights" / "best.pt"
    if not run_best_checkpoint.exists():
        # Check fallback directory structure
        candidate = project_dir / experiment_name / "best.pt"
        if candidate.exists():
            run_best_checkpoint = candidate

    output_weights_path.parent.mkdir(parents=True, exist_ok=True)

    if run_best_checkpoint.exists():
        shutil.copy2(run_best_checkpoint, output_weights_path)
        logger.info(f"Successfully saved best checkpoint to: {output_weights_path.resolve()}")
        # Also copy an alias for rdd2022_yolov8.pt
        alias_path = output_weights_path.parent / "rdd2022_yolov8.pt"
        shutil.copy2(run_best_checkpoint, alias_path)
    else:
        logger.warning(f"best.pt not found at expected path: {run_best_checkpoint}")

    # Evaluate validation metrics
    logger.info("Running validation on best model checkpoint...")
    metrics = model.val()
    logger.info(f"Validation mAP@50:    {metrics.box.map50:.4f}")
    logger.info(f"Validation mAP@50-95: {metrics.box.map:.4f}")

    return output_weights_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fine-tune YOLOv8n on RDD2022 Road Damage Dataset")
    parser.add_argument("--data", type=str, default="datasets/rdd2022_india/data.yaml", help="Path to data.yaml")
    parser.add_argument("--epochs", type=int, default=100, help="Number of training epochs (default: 100)")
    parser.add_argument("--imgsz", type=int, default=640, help="Image resolution for training (default: 640)")
    parser.add_argument("--batch", type=int, default=16, help="Batch size (default: 16)")
    parser.add_argument("--weights", type=str, default="yolov8n.pt", help="Pretrained weights checkpoint (default: yolov8n.pt)")
    parser.add_argument("--output", type=str, default="ai-engine/weights/best_road_damage.pt", help="Path to save best.pt")
    parser.add_argument("--device", type=str, default=None, help="Device to use (cpu, mps, 0, etc.)")
    parser.add_argument("--patience", type=int, default=25, help="Early stopping patience (default: 25)")

    args = parser.parse_args()

    train_yolov8n(
        data_yaml=Path(args.data),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch_size=args.batch,
        pretrained_weights=args.weights,
        output_weights_path=Path(args.output),
        device=args.device,
        patience=args.patience
    )

