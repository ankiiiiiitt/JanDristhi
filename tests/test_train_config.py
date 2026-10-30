"""
Tests for YOLOv8n fine-tuning configuration and device resolution.
"""

import unittest
import importlib.util
from pathlib import Path

# Load train.py dynamically due to hyphen in 'ai-engine'
train_spec = importlib.util.spec_from_file_location("train_module", Path("ai-engine/train.py"))
train_mod = importlib.util.module_from_spec(train_spec)
train_spec.loader.exec_module(train_mod)
resolve_compute_device = train_mod.resolve_compute_device


class TestTrainConfig(unittest.TestCase):

    def test_resolve_compute_device_override(self):
        self.assertEqual(resolve_compute_device("cpu"), "cpu")
        self.assertEqual(resolve_compute_device("0"), "0")
        self.assertEqual(resolve_compute_device("mps"), "mps")

    def test_default_device_detection(self):
        dev = resolve_compute_device()
        self.assertIn(dev, ["cpu", "mps", "0"])


if __name__ == "__main__":
    unittest.main()
