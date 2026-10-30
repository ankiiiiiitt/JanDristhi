"""
Tests for RDD2022 to YOLOv8 conversion and validation.
Verifies correct class mappings, coordinate normalization, and validation rules.
"""

import tempfile
import unittest
from pathlib import Path
from scripts.convert_rdd2022_to_yolo import (
    CLASS_MAPPING,
    parse_voc_xml,
    validate_yolo_labels,
    convert_dataset
)

SAMPLE_VOC_XML = """<annotation>
    <folder>India</folder>
    <filename>India_000001.jpg</filename>
    <size>
        <width>1000</width>
        <height>500</height>
        <depth>3</depth>
    </size>
    <object>
        <name>D00</name>
        <bndbox>
            <xmin>100</xmin>
            <ymin>100</ymin>
            <xmax>300</xmax>
            <ymax>300</ymax>
        </bndbox>
    </object>
    <object>
        <name>D10</name>
        <bndbox>
            <xmin>400</xmin>
            <ymin>200</ymin>
            <xmax>600</xmax>
            <ymax>400</ymax>
        </bndbox>
    </object>
    <object>
        <name>D20</name>
        <bndbox>
            <xmin>700</xmin>
            <ymin>50</ymin>
            <xmax>900</xmax>
            <ymax>250</ymax>
        </bndbox>
    </object>
    <object>
        <name>D40</name>
        <bndbox>
            <xmin>50</xmin>
            <ymin>350</ymin>
            <xmax>250</xmax>
            <ymax>450</ymax>
        </bndbox>
    </object>
</annotation>"""


class TestRDD2022YOLOConversion(unittest.TestCase):

    def test_class_mappings(self):
        self.assertEqual(CLASS_MAPPING["D00"], 0)  # Longitudinal Cracks
        self.assertEqual(CLASS_MAPPING["D10"], 1)  # Transverse Cracks
        self.assertEqual(CLASS_MAPPING["D20"], 2)  # Alligator Cracking
        self.assertEqual(CLASS_MAPPING["D40"], 3)  # Potholes

    def test_parse_voc_xml(self):
        with tempfile.NamedTemporaryFile("w", suffix=".xml", delete=False) as f:
            f.write(SAMPLE_VOC_XML)
            xml_path = Path(f.name)

        try:
            w, h, boxes = parse_voc_xml(xml_path)
            self.assertEqual(w, 1000)
            self.assertEqual(h, 500)
            self.assertEqual(len(boxes), 4)

            # Box 0: D00 [100, 100, 300, 300] on 1000x500 image
            # x_center = 200/1000 = 0.20, y_center = 200/500 = 0.40
            # width = 200/1000 = 0.20, height = 200/500 = 0.40
            cls0, xc0, yc0, bw0, bh0 = boxes[0]
            self.assertEqual(cls0, 0)
            self.assertAlmostEqual(xc0, 0.20, places=4)
            self.assertAlmostEqual(yc0, 0.40, places=4)
            self.assertAlmostEqual(bw0, 0.20, places=4)
            self.assertAlmostEqual(bh0, 0.40, places=4)

            # Box 3: D40 [50, 350, 250, 450] on 1000x500 image
            cls3, xc3, yc3, bw3, bh3 = boxes[3]
            self.assertEqual(cls3, 3)
            self.assertAlmostEqual(xc3, 0.15, places=4)
            self.assertAlmostEqual(yc3, 0.80, places=4)
        finally:
            xml_path.unlink()

    def test_validate_yolo_labels(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)
            good_lbl = tmp_path / "sample.txt"
            with open(good_lbl, "w") as f:
                f.write("0 0.5 0.5 0.2 0.2\n")
                f.write("1 0.3 0.4 0.1 0.1\n")
                f.write("2 0.7 0.8 0.15 0.25\n")
                f.write("3 0.1 0.2 0.05 0.05\n")

            stats = validate_yolo_labels(tmp_path)
            self.assertEqual(stats["total_files"], 1)
            self.assertEqual(stats["valid_files"], 1)
            self.assertEqual(stats["total_boxes"], 4)
            self.assertEqual(len(stats["errors"]), 0)
            self.assertEqual(stats["class_counts"][0], 1)
            self.assertEqual(stats["class_counts"][1], 1)
            self.assertEqual(stats["class_counts"][2], 1)
            self.assertEqual(stats["class_counts"][3], 1)


if __name__ == "__main__":
    unittest.main()

