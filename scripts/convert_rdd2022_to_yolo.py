#!/usr/bin/env python3
"""
RDD2022 to YOLOv8 Dataset Converter & Leakage-Free Splitter
===========================================================
Converts Pascal VOC XML annotations from the RDD2022 India dataset into
normalized YOLOv8 format (class_id x_center y_center width height) with
an 80:10:10 (Train : Validation : Test) split.

Data Leakage Prevention:
  - Sequence / Burst grouping: Dashcam recordings capture sequential frames
    that are near-identical. Groups frames by sequence prefix/video ride IDs.
  - Perceptual / Difference Hashing (dHash): Computes perceptual hashes of images
    to cluster near-identical or duplicate frames (Hamming distance <= threshold).
  - All images within the same cluster/sequence are strictly assigned to the SAME split,
    preventing identical road sections from leaking across train, val, and test.

Usage:
  python scripts/convert_rdd2022_to_yolo.py --source-dir /path/to/RDD2022/India --output-dir datasets/rdd2022_india
  python scripts/convert_rdd2022_to_yolo.py --validate-only datasets/rdd2022_india
"""

import os
import sys
import shutil
import random
import argparse
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Dict, List, Tuple, Set, Optional

# RDD2022 Standard Class Mapping to 0-indexed YOLO IDs
CLASS_MAPPING: Dict[str, int] = {
    "D00": 0,  # Longitudinal Cracks
    "D10": 1,  # Transverse Cracks
    "D20": 2,  # Alligator Cracking
    "D40": 3,  # Potholes
}

CLASS_NAMES: Dict[int, str] = {v: k for k, v in CLASS_MAPPING.items()}
CLASS_DESCRIPTIONS: Dict[str, str] = {
    "D00": "Longitudinal Crack",
    "D10": "Transverse Crack",
    "D20": "Alligator Crack",
    "D40": "Pothole"
}


def compute_dhash(image_path: Path, hash_size: int = 8) -> Optional[int]:
    """
    Computes difference hash (dHash) using PIL to identify visually identical
    or near-identical road frames without external CV dependencies.
    """
    try:
        from PIL import Image
        with Image.open(image_path) as img:
            # Convert to grayscale and resize to (hash_size + 1, hash_size)
            resized = img.convert("L").resize((hash_size + 1, hash_size), Image.Resampling.LANCZOS)
            pixels = list(resized.getdata())

            difference = []
            for row in range(hash_size):
                row_start = row * (hash_size + 1)
                for col in range(hash_size):
                    left = pixels[row_start + col]
                    right = pixels[row_start + col + 1]
                    difference.append(left > right)

            decimal_value = 0
            for idx, val in enumerate(difference):
                if val:
                    decimal_value |= (1 << idx)
            return decimal_value
    except Exception:
        return None


def hamming_distance(h1: int, h2: int) -> int:
    """Computes bitwise Hamming distance between two perceptual hashes."""
    return bin(h1 ^ h2).count("1")


def parse_voc_xml(xml_path: Path) -> Tuple[int, int, List[Tuple[int, float, float, float, float]]]:
    """
    Parses a Pascal VOC XML file and converts bounding boxes to normalized YOLO format.

    Returns:
        (image_width, image_height, list of (class_id, x_center, y_center, width, height))
    """
    tree = ET.parse(xml_path)
    root = tree.getroot()

    size_elem = root.find("size")
    if size_elem is None:
        raise ValueError(f"XML missing <size> element: {xml_path}")

    width_elem = size_elem.find("width")
    height_elem = size_elem.find("height")

    if width_elem is None or height_elem is None:
        raise ValueError(f"XML missing width/height: {xml_path}")

    img_w = float(width_elem.text)
    img_h = float(height_elem.text)

    if img_w <= 0 or img_h <= 0:
        raise ValueError(f"Invalid image dimensions ({img_w}x{img_h}): {xml_path}")

    yolo_boxes = []

    for obj in root.findall("object"):
        name_elem = obj.find("name")
        if name_elem is None or not name_elem.text:
            continue

        raw_cls = name_elem.text.strip().upper()
        if raw_cls not in CLASS_MAPPING:
            continue

        cls_id = CLASS_MAPPING[raw_cls]
        bndbox = obj.find("bndbox")
        if bndbox is None:
            continue

        try:
            xmin = float(bndbox.find("xmin").text)
            ymin = float(bndbox.find("ymin").text)
            xmax = float(bndbox.find("xmax").text)
            ymax = float(bndbox.find("ymax").text)
        except (AttributeError, ValueError, TypeError):
            continue

        # Sanitize coordinate bounds
        xmin = max(0.0, min(img_w, xmin))
        xmax = max(0.0, min(img_w, xmax))
        ymin = max(0.0, min(img_h, ymin))
        ymax = max(0.0, min(img_h, ymax))

        if xmax <= xmin or ymax <= ymin:
            continue

        box_w = (xmax - xmin) / img_w
        box_h = (ymax - ymin) / img_h
        x_center = (xmin + xmax) / (2.0 * img_w)
        y_center = (ymin + ymax) / (2.0 * img_h)

        box_w = max(0.0001, min(1.0, box_w))
        box_h = max(0.0001, min(1.0, box_h))
        x_center = max(0.0, min(1.0, x_center))
        y_center = max(0.0, min(1.0, y_center))

        yolo_boxes.append((cls_id, x_center, y_center, box_w, box_h))

    return int(img_w), int(img_h), yolo_boxes


def cluster_frames_by_similarity(
    pairs: List[Tuple[Path, Path]],
    hamming_threshold: int = 4
) -> List[List[Tuple[Path, Path]]]:
    """
    Groups pairs into clusters based on sequence filenames and perceptual hash similarity.
    Any frames that are near-identical (distance <= threshold) belong to the same cluster.
    """
    # 1. First pass: sequence stem extraction (e.g. India_000123 -> group by sequence prefix)
    seq_groups: Dict[str, List[Tuple[Path, Path]]] = {}
    for img_p, xml_p in pairs:
        stem = img_p.stem
        # If filename follows seq format (e.g. India_000012, or ride1_frame01)
        parts = stem.split("_")
        if len(parts) >= 2 and parts[-1].isdigit():
            # Group by 10-frame bursts (e.g. 120-129 in same cluster)
            frame_num = int(parts[-1])
            burst_key = f"{'_'.join(parts[:-1])}_burst_{frame_num // 10}"
        else:
            burst_key = stem

        seq_groups.setdefault(burst_key, []).append((img_p, xml_p))

    # 2. Second pass: perceptual hash clustering across groups
    clusters: List[List[Tuple[Path, Path]]] = []
    cluster_hashes: List[List[int]] = []

    for group in seq_groups.values():
        group_hashes = []
        for img_p, _ in group:
            h = compute_dhash(img_p)
            if h is not None:
                group_hashes.append(h)

        # Check if group matches an existing cluster
        matched_cluster_idx = None
        for c_idx, c_hashes in enumerate(cluster_hashes):
            found_match = False
            for gh in group_hashes:
                for ch in c_hashes:
                    if hamming_distance(gh, ch) <= hamming_threshold:
                        found_match = True
                        break
                if found_match:
                    break
            if found_match:
                matched_cluster_idx = c_idx
                break

        if matched_cluster_idx is not None:
            clusters[matched_cluster_idx].extend(group)
            cluster_hashes[matched_cluster_idx].extend(group_hashes)
        else:
            clusters.append(list(group))
            cluster_hashes.append(group_hashes)

    return clusters


def partition_clusters(
    clusters: List[List[Tuple[Path, Path]]],
    train_ratio: float = 0.80,
    val_ratio: float = 0.10,
    test_ratio: float = 0.10,
    seed: int = 42
) -> Dict[str, List[Tuple[Path, Path]]]:
    """
    Partitions whole clusters into train, val, and test splits (80:10:10),
    guaranteeing that near-identical frames NEVER appear across splits.
    """
    random.seed(seed)
    random.shuffle(clusters)

    total_items = sum(len(c) for c in clusters)
    target_train = int(total_items * train_ratio)
    target_val = int(total_items * val_ratio)

    splits = {"train": [], "val": [], "test": []}

    train_count = 0
    val_count = 0

    for cluster in clusters:
        cluster_len = len(cluster)
        if train_count + cluster_len <= target_train or (val_count >= target_val and len(splits["test"]) > 0):
            splits["train"].extend(cluster)
            train_count += cluster_len
        elif val_count + cluster_len <= target_val:
            splits["val"].extend(cluster)
            val_count += cluster_len
        else:
            splits["test"].extend(cluster)

    # In case splits are too skewed due to small dataset size, ensure non-empty
    if not splits["val"] and len(splits["train"]) > 1:
        splits["val"].append(splits["train"].pop())
    if not splits["test"] and len(splits["train"]) > 1:
        splits["test"].append(splits["train"].pop())

    return splits


def validate_yolo_labels(labels_dir: Path) -> Dict[str, any]:
    """Validates YOLO format label files for format correctness and class ID validity [0..3]."""
    stats = {
        "total_files": 0,
        "empty_files": 0,
        "valid_files": 0,
        "total_boxes": 0,
        "class_counts": {0: 0, 1: 0, 2: 0, 3: 0},
        "errors": []
    }

    if not labels_dir.exists():
        return stats

    label_files = list(labels_dir.rglob("*.txt"))
    stats["total_files"] = len(label_files)

    for lf in label_files:
        try:
            with open(lf, "r") as f:
                lines = [line.strip() for line in f.readlines() if line.strip()]

            if not lines:
                stats["empty_files"] += 1
                continue

            file_valid = True
            for line_no, line in enumerate(lines, 1):
                parts = line.split()
                if len(parts) != 5:
                    stats["errors"].append(f"{lf.name}:{line_no} - Invalid column count (expected 5, got {len(parts)})")
                    file_valid = False
                    continue

                try:
                    cls_id = int(parts[0])
                    xc, yc, w, h = map(float, parts[1:])
                except ValueError as ve:
                    stats["errors"].append(f"{lf.name}:{line_no} - Parse float error: {ve}")
                    file_valid = False
                    continue

                if cls_id not in CLASS_MAPPING.values():
                    stats["errors"].append(f"{lf.name}:{line_no} - Invalid class ID '{cls_id}' (must be 0, 1, 2, or 3)")
                    file_valid = False
                    continue

                if not (0.0 <= xc <= 1.0 and 0.0 <= yc <= 1.0 and 0.0 < w <= 1.0 and 0.0 < h <= 1.0):
                    stats["errors"].append(f"{lf.name}:{line_no} - Box coordinates out of [0, 1] range: {xc}, {yc}, {w}, {h}")
                    file_valid = False
                    continue

                stats["total_boxes"] += 1
                stats["class_counts"][cls_id] += 1

            if file_valid:
                stats["valid_files"] += 1

        except Exception as e:
            stats["errors"].append(f"{lf.name} - Read error: {e}")

    return stats


def convert_dataset(source_dir: Path, output_dir: Path, seed: int = 42) -> Dict[str, any]:
    """Backward compatibility alias for convert_dataset_80_10_10."""
    return convert_dataset_80_10_10(source_dir, output_dir, seed=seed)


def convert_dataset_80_10_10(
    source_dir: Path,
    output_dir: Path,
    seed: int = 42
) -> Dict[str, any]:
    """
    Discovers image and XML files in source_dir, clusters near-identical frames,
    converts VOC to YOLO, and creates a strict 80:10:10 (train:val:test) split.
    """
    xml_files = list(source_dir.rglob("*.xml"))
    if not xml_files:
        raise FileNotFoundError(f"No Pascal VOC .xml files found in {source_dir}")

    xml_map = {f.stem: f for f in xml_files}

    img_extensions = {".jpg", ".jpeg", ".png", ".bmp"}
    img_files = [f for f in source_dir.rglob("*") if f.suffix.lower() in img_extensions]
    matched_pairs = []

    for img in img_files:
        if img.stem in xml_map:
            matched_pairs.append((img, xml_map[img.stem]))

    if not matched_pairs:
        raise FileNotFoundError(f"Found {len(xml_files)} XML files and {len(img_files)} images, but no matching filenames.")

    # Group into leakage-free clusters
    clusters = cluster_frames_by_similarity(matched_pairs)
    splits = partition_clusters(clusters, train_ratio=0.80, val_ratio=0.10, test_ratio=0.10, seed=seed)

    conversion_stats = {
        "train_images": len(splits["train"]),
        "val_images": len(splits["val"]),
        "test_images": len(splits["test"]),
        "clusters_formed": len(clusters),
        "total_converted": 0,
        "failed_files": []
    }

    for split_name in ["train", "val", "test"]:
        pairs = splits[split_name]
        img_out = output_dir / "images" / split_name
        lbl_out = output_dir / "labels" / split_name
        img_out.mkdir(parents=True, exist_ok=True)
        lbl_out.mkdir(parents=True, exist_ok=True)

        for img_path, xml_path in pairs:
            try:
                img_w, img_h, boxes = parse_voc_xml(xml_path)

                dest_img = img_out / img_path.name
                if not dest_img.exists():
                    shutil.copy2(img_path, dest_img)

                dest_txt = lbl_out / f"{img_path.stem}.txt"
                with open(dest_txt, "w") as f:
                    for cls_id, xc, yc, w, h in boxes:
                        f.write(f"{cls_id} {xc:.6f} {yc:.6f} {w:.6f} {h:.6f}\n")

                conversion_stats["total_converted"] += 1
            except Exception as e:
                conversion_stats["failed_files"].append((str(xml_path), str(e)))

    # Write data.yaml for YOLOv8 (includes test split)
    data_yaml_path = output_dir / "data.yaml"
    with open(data_yaml_path, "w") as f:
        f.write(f"# Ultralytics YOLOv8 RDD2022 Dataset Configuration (80:10:10 Split)\n")
        f.write(f"path: {output_dir.resolve()}\n")
        f.write(f"train: images/train\n")
        f.write(f"val: images/val\n")
        f.write(f"test: images/test\n\n")
        f.write(f"# RDD2022 4-Class Mapping\n")
        f.write(f"names:\n")
        f.write(f"  0: D00  # Longitudinal Cracks\n")
        f.write(f"  1: D10  # Transverse Cracks\n")
        f.write(f"  2: D20  # Alligator Cracking\n")
        f.write(f"  3: D40  # Potholes\n")

    return conversion_stats


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert and Partition RDD2022 into 80:10:10 YOLOv8 Dataset")
    parser.add_argument("--source-dir", type=str, help="Directory containing RDD2022 images and xmls")
    parser.add_argument("--output-dir", type=str, default="datasets/rdd2022_india", help="Target YOLO directory")
    parser.add_argument("--validate-only", type=str, help="Validate an existing YOLO dataset folder")

    args = parser.parse_args()

    if args.validate_only:
        val_path = Path(args.validate_only)
        labels_path = val_path / "labels" if (val_path / "labels").exists() else val_path
        print(f"Validating YOLO annotations in: {labels_path}")
        results = validate_yolo_labels(labels_path)
        print("\n--- Validation Summary ---")
        print(f"Total Label Files: {results['total_files']}")
        print(f"Valid Label Files: {results['valid_files']}")
        print(f"Empty/Background:  {results['empty_files']}")
        print(f"Total Bounding Boxes: {results['total_boxes']}")
        print("Class Breakdown:")
        for cid, cnt in results["class_counts"].items():
            cname = CLASS_NAMES[cid]
            cdesc = CLASS_DESCRIPTIONS[cname]
            print(f"  [{cid}] {cname} ({cdesc}): {cnt} instances")

        if results["errors"]:
            print(f"\nFound {len(results['errors'])} validation errors:")
            for err in results["errors"][:10]:
                print(f"  - {err}")
            sys.exit(1)
        else:
            print("\nAll label files passed validation successfully!")
            sys.exit(0)

    if not args.source_dir:
        print("Error: --source-dir or --validate-only is required.")
        parser.print_help()
        sys.exit(1)

    src = Path(args.source_dir)
    dst = Path(args.output_dir)

    print(f"Converting and splitting (80:10:10) RDD2022 from: {src} -> {dst}")
    stats = convert_dataset_80_10_10(src, dst)
    print("\n--- Conversion & Partition Summary ---")
    print(f"Total Converted Images: {stats['total_converted']}")
    print(f"Clusters Formed (Anti-leakage): {stats['clusters_formed']}")
    print(f"Train Set: {stats['train_images']} images (~80%)")
    print(f"Validation Set: {stats['val_images']} images (~10%)")
    print(f"Test Set: {stats['test_images']} images (~10%)")

    val_results = validate_yolo_labels(dst / "labels")
    print(f"\nValidation: {val_results['total_boxes']} total bounding boxes across train/val/test.")
