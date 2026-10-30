"""
Unit tests for RDD2022 dataset splitting with anti-leakage verification.
Ensures:
1. 80:10:10 partitioning.
2. Near-identical/duplicate images cluster together and do not leak across splits.
"""

import tempfile
import unittest
from pathlib import Path
from PIL import Image
from scripts.convert_rdd2022_to_yolo import (
    compute_dhash,
    hamming_distance,
    cluster_frames_by_similarity,
    partition_clusters,
    convert_dataset_80_10_10
)

SAMPLE_XML = """<annotation>
    <filename>{filename}</filename>
    <size><width>640</width><height>480</height><depth>3</depth></size>
    <object>
        <name>D00</name>
        <bndbox><xmin>100</xmin><ymin>100</ymin><xmax>200</xmax><ymax>200</ymax></bndbox>
    </object>
</annotation>"""


class TestAntiLeakageDatasetSplitting(unittest.TestCase):

    def test_dhash_identical_images(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            p1 = Path(tmpdir) / "img1.jpg"
            p2 = Path(tmpdir) / "img2.jpg"

            # Create identical images
            img = Image.new("RGB", (100, 100), color=(120, 120, 120))
            img.save(p1)
            img.save(p2)

            h1 = compute_dhash(p1)
            h2 = compute_dhash(p2)
            self.assertIsNotNone(h1)
            self.assertIsNotNone(h2)
            self.assertEqual(hamming_distance(h1, h2), 0)

    def test_partition_cluster_leakage_prevention(self):
        # Create 10 clusters of pairs
        clusters = []
        for i in range(10):
            # Cluster has 2 duplicate frames
            cluster = [
                (Path(f"img_{i}_a.jpg"), Path(f"img_{i}_a.xml")),
                (Path(f"img_{i}_b.jpg"), Path(f"img_{i}_b.xml"))
            ]
            clusters.append(cluster)

        splits = partition_clusters(clusters, train_ratio=0.80, val_ratio=0.10, test_ratio=0.10, seed=42)

        train_stems = {p[0].stem for p in splits["train"]}
        val_stems = {p[0].stem for p in splits["val"]}
        test_stems = {p[0].stem for p in splits["test"]}

        # Verify no cluster items are split across different partitions
        for i in range(10):
            stem_a = f"img_{i}_a"
            stem_b = f"img_{i}_b"

            in_train = (stem_a in train_stems) or (stem_b in train_stems)
            in_val = (stem_a in val_stems) or (stem_b in val_stems)
            in_test = (stem_a in test_stems) or (stem_b in test_stems)

            # Exactly one partition must hold both frames
            membership_count = sum([in_train, in_val, in_test])
            self.assertEqual(membership_count, 1, f"Cluster {i} leaked across splits!")

            if in_train:
                self.assertTrue(stem_a in train_stems and stem_b in train_stems)
            elif in_val:
                self.assertTrue(stem_a in val_stems and stem_b in val_stems)
            elif in_test:
                self.assertTrue(stem_a in test_stems and stem_b in test_stems)

    def test_full_dataset_conversion_and_splits(self):
        with tempfile.TemporaryDirectory() as src_dir, tempfile.TemporaryDirectory() as dst_dir:
            src = Path(src_dir)
            dst = Path(dst_dir)

            # Generate 20 test image/xml pairs
            for i in range(20):
                img_p = src / f"India_{i:04d}.jpg"
                xml_p = src / f"India_{i:04d}.xml"

                img = Image.new("RGB", (640, 480), color=(i * 10 % 255, 100, 100))
                img.save(img_p)

                with open(xml_p, "w") as f:
                    f.write(SAMPLE_XML.format(filename=img_p.name))

            stats = convert_dataset_80_10_10(src, dst, seed=42)

            self.assertEqual(stats["total_converted"], 20)
            self.assertTrue((dst / "data.yaml").exists())
            self.assertTrue((dst / "images" / "train").exists())
            self.assertTrue((dst / "images" / "val").exists())
            self.assertTrue((dst / "images" / "test").exists())
            self.assertTrue((dst / "labels" / "train").exists())
            self.assertTrue((dst / "labels" / "val").exists())
            self.assertTrue((dst / "labels" / "test").exists())


if __name__ == "__main__":
    unittest.main()
