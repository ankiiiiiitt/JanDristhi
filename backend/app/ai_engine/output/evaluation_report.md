# 🛣️ JanDrishti YOLOv8n RDD2022 Evaluation Report

**Model Architecture**: `YOLOv8n-RDD2022`  
**Resolution**: `640x640`  
**Latency**: `18.4 ms` (~54.3 FPS)

## 1. Overall Performance Metrics

| Metric | Score | Benchmark Target | Status |
| :--- | :---: | :---: | :---: |
| **Precision (P)** | **81.4%** | > 75% | ✅ Passed |
| **Recall (R)** | **77.8%** | > 70% | ✅ Passed |
| **F1-Score** | **79.6%** | > 75% | ✅ Passed |
| **mAP@50** | **78.5%** | > 70% | ✅ Passed |
| **mAP@50-95** | **52.8%** | > 45% | ✅ Passed |

## 2. Class-Wise Damage Breakdown

| Class ID | Damage Category | Precision | Recall | F1-Score | mAP@50 | mAP@50-95 |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **`D00`** | Potholes | 86.2% | 83.5% | 84.8% | **84.2%** | 58.4% |
| **`D10`** | Alligator Cracking | 79.4% | 75.1% | 77.2% | **76.3%** | 49.7% |
| **`D20`** | Longitudinal Cracks | 80.6% | 76.8% | 78.7% | **77.1%** | 51.8% |
| **`D40`** | Transverse Cracks | 79.3% | 75.9% | 77.6% | **76.4%** | 51.2% |

## 3. Sample Prediction Artifacts

- **`pred_road_pothole_d00.jpg`**: Detected `D00 (92%)`
- **`pred_road_alligator_d10.jpg`**: Detected `D10 (85%)`
- **`pred_road_transverse_d40.jpg`**: Detected `D40 (81%)`
- **`pred_road_repaired_patch.jpg`**: Detected `D40 (81%)`