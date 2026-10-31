"""
Road Condition ML Service for FastAPI Backend
=============================================
Connects the trained road-condition ML model into JanDrishti's FastAPI architecture.
Includes foreign region disclosure and dataset comparison metadata.
"""

import sys
from pathlib import Path
from typing import Dict, Any, Optional

# Ensure ai-engine is in sys.path
for candidate_ai in [
    Path(__file__).resolve().parent.parent / "ai_engine",
    Path(__file__).resolve().parent.parent.parent.parent / "ai-engine",
    Path("ai-engine")
]:
    if candidate_ai.exists() and str(candidate_ai) not in sys.path:
        sys.path.insert(0, str(candidate_ai))

from road_condition_predictor import road_condition_predictor, RoadConditionPredictor


DATASET_COMPARISON = {
    "opendatani": {
        "dataset_name": "Carriageway and Footway Surface Defects",
        "jurisdiction": "Northern Ireland, United Kingdom",
        "publisher": "Department for Infrastructure (DfI Roads), Northern Ireland",
        "data_format": "CSV (tabular incident tickets)",
        "records_count": "150,000+ incident logs",
        "core_attributes": [
            "INSTRUCTION_REFERENCE", "DEFECT_DETAIL", "SECTION_NAME", "DIVISION",
            "DEFECT_STATUS", "EASTING", "NORTHING", "RESPONSE_TIME_NAME", "CLASS_NAME"
        ],
        "nature": "Municipal repair tickets and dispatch turnaround SLAs",
        "pci_pavement_metrics_present": False,
        "suitability_for_pci_ml": "Low (Lacks quantitative roughness and condition index targets; useful as defect SLA reference)",
        "selected_for_pci_model": False
    },
    "ontario_mto": {
        "dataset_name": "Pavement Condition for Provincial Highways",
        "jurisdiction": "Ontario, Canada",
        "publisher": "Ministry of Transportation, Ontario (Canada)",
        "data_format": "CSV (Automated Road Analyzer ARAN surveys)",
        "records_count": "1,890 surveyed highway sections",
        "core_attributes": [
            "PCI (Pavement Condition Index, 0-100)",
            "DMI (Distress Manifestation Index, 0-10)",
            "IRI (International Roughness Index, m/km)",
            "FROM_Distance", "TO_Distance", "Pave_Type", "FUNC_CLASS"
        ],
        "nature": "Standardized ASTM D6433 quantitative pavement sensor telemetry",
        "pci_pavement_metrics_present": True,
        "suitability_for_pci_ml": "High (Direct mathematical match for JanDrishti's Infrastructure Health Score and sensor shocks)",
        "selected_for_pci_model": True
    }
}


class RoadConditionService:
    def __init__(self):
        self.predictor = road_condition_predictor

    def predict(
        self,
        dmi: float,
        iri: float,
        segment_length_km: float = 1.0,
        pave_type: str = "AC",
        func_class: str = "ART"
    ) -> Dict[str, Any]:
        """Runs road condition inference with foreign reference attribution."""
        return self.predictor.predict(
            dmi=dmi,
            iri=iri,
            segment_length_km=segment_length_km,
            pave_type=pave_type,
            func_class=func_class
        )

    def predict_from_telemetry(
        self,
        telemetry_z_shock: Optional[float] = None,
        potholes_count: int = 0,
        cracks_count: int = 0,
        pave_type: str = "AC",
        func_class: str = "ART"
    ) -> Dict[str, Any]:
        """
        Translates live JanDrishti telemetry into estimated DMI and IRI,
        then computes the standardized condition prediction.
        """
        z_shock = float(telemetry_z_shock or 2.0)
        # Higher accelerometer z-shock indicates higher roughness (IRI)
        estimated_iri = max(0.6, round(0.5 + 0.38 * z_shock, 2))

        # Higher defect density reduces the distress manifestation index (DMI: 10.0 is perfect)
        defect_penalty = (potholes_count * 1.1) + (cracks_count * 0.45)
        estimated_dmi = max(3.5, round(10.0 - defect_penalty, 2))

        result = self.predict(
            dmi=estimated_dmi,
            iri=estimated_iri,
            segment_length_km=1.0,
            pave_type=pave_type,
            func_class=func_class
        )

        result["telemetry_inputs"] = {
            "telemetry_z_shock": z_shock,
            "potholes_count": potholes_count,
            "cracks_count": cracks_count,
            "estimated_iri": estimated_iri,
            "estimated_dmi": estimated_dmi
        }
        return result

    def get_metadata(self) -> Dict[str, Any]:
        """Returns model metadata, dataset comparison, and foreign data provenance."""
        return {
            "model_metadata": self.predictor.metadata,
            "dataset_comparison": DATASET_COMPARISON,
            "selection_rationale": (
                "Ontario's dataset was selected because it provides rigorous, standardized "
                "continuous measurements of PCI (Pavement Condition Index, 0-100), DMI (Distress), "
                "and IRI (International Roughness Index). OpenDataNI provides operational repair tickets "
                "without continuous pavement condition indexes."
            ),
            "foreign_region_disclosure": {
                "is_chandigarh_local_data": False,
                "training_region": "Ontario, Canada",
                "policy": (
                    "All model predictions originate from foreign reference data (Ontario MTO) "
                    "and are explicitly tagged as such. They must NEVER be represented as actual "
                    "Chandigarh municipal road survey data."
                )
            }
        }


road_condition_service = RoadConditionService()

