import os
import sys
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import FileResponse, JSONResponse

from app.config import settings
from app.database.mongodb import db_manager
from app.services.mock_store import mock_store

logger = logging.getLogger("jandrishti.reports")
router = APIRouter(prefix="/reports", tags=["Inspection & Audit Reports"])

# Base report cache / storage dir
REPORTS_DIR = Path(settings.UPLOAD_STORAGE_DIR) / "generated_reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)


def get_pdf_script_path() -> Path:
    """Resolves path to scripts/generate_pdf_report.py."""
    root_dir = Path(__file__).resolve().parent.parent.parent.parent
    return root_dir / "scripts" / "generate_pdf_report.py"


@router.get("", summary="List Generated Municipal Reports")
async def list_reports():
    """Returns catalog of generated municipal road audit reports."""
    reports = [
        {
            "report_id": "REP-CHD-MUNICIPAL-2026",
            "title": "JanDrishti Municipal Infrastructure Technical Manual & Audit",
            "format": "PDF",
            "sector": "All Sectors (Chandigarh)",
            "page_count": 8,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "download_url": f"{settings.API_PREFIX}/reports/download/manual"
        },
        {
            "report_id": "REP-CHD-SEC17-Q4",
            "title": "Sector 17 Commercial Corridor Damage Assessment",
            "format": "PDF",
            "sector": "Sector 17",
            "page_count": 4,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "download_url": f"{settings.API_PREFIX}/reports/download/manual"
        },
        {
            "report_id": "REP-CHD-SEC22-Q4",
            "title": "Sector 22 Pothole & Fatigue Crack Audit",
            "format": "PDF",
            "sector": "Sector 22",
            "page_count": 4,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "download_url": f"{settings.API_PREFIX}/reports/download/manual"
        }
    ]
    return {
        "success": True,
        "count": len(reports),
        "data": reports
    }


@router.get("/generate/pdf", summary="Generate Municipal Infrastructure PDF Report")
async def generate_pdf_report(
    sector: Optional[str] = Query(None, description="Filter for specific sector (e.g. 'Sector 17')")
):
    """
    Triggers dynamic generation of a publication-grade PDF report
    using the existing ReportLab engine script and returns metadata with download path.
    """
    try:
        script_path = get_pdf_script_path()
        if not script_path.exists():
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Report generator script not found at {script_path}"
            )

        # Import create_pdf from scripts/generate_pdf_report.py dynamically
        import importlib.util
        spec = importlib.util.spec_from_file_location("generate_pdf_report", script_path)
        pdf_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(pdf_module)

        now_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        sector_slug = (sector or "all_sectors").lower().replace(" ", "_")
        filename = f"JanDrishti_Audit_{sector_slug}_{now_str}.pdf"
        output_file_path = REPORTS_DIR / filename

        # Execute PDF generation
        pdf_module.create_pdf(str(output_file_path))

        file_size_bytes = output_file_path.stat().st_size if output_file_path.exists() else 0

        return {
            "success": True,
            "message": "Municipal PDF audit report generated successfully.",
            "data": {
                "report_id": f"REP-{now_str}",
                "filename": filename,
                "file_size_bytes": file_size_bytes,
                "sector": sector or "All Sectors",
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "download_url": f"{settings.API_PREFIX}/reports/download/{filename}"
            }
        }
    except Exception as e:
        logger.error(f"Failed to generate PDF report: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate PDF report: {str(e)}"
        )


@router.get("/download/{filename}", summary="Download Generated PDF Report")
async def download_pdf_report(filename: str):
    """
    Streams the requested PDF audit file as a downloadable binary attachment.
    Supports predefined 'manual' alias as well as dynamically generated filenames.
    """
    root_dir = Path(__file__).resolve().parent.parent.parent.parent

    # Special alias for primary technical manual
    if filename == "manual" or filename == "JanDrishti_Technical_Manual.pdf":
        candidates = [
            root_dir / "JanDrishti_Technical_Manual.pdf",
            REPORTS_DIR / "JanDrishti_Technical_Manual.pdf"
        ]
        for c in candidates:
            if c.exists():
                return FileResponse(
                    path=str(c),
                    media_type="application/pdf",
                    filename="JanDrishti_Technical_Manual.pdf"
                )

        # If not on disk, generate it on the fly
        script_path = get_pdf_script_path()
        if script_path.exists():
            import importlib.util
            spec = importlib.util.spec_from_file_location("generate_pdf_report", script_path)
            pdf_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(pdf_module)
            manual_out = root_dir / "JanDrishti_Technical_Manual.pdf"
            pdf_module.create_pdf(str(manual_out))
            return FileResponse(
                path=str(manual_out),
                media_type="application/pdf",
                filename="JanDrishti_Technical_Manual.pdf"
            )

    # Search in generated reports directory
    target_path = REPORTS_DIR / filename
    if not target_path.exists() or not target_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report file '{filename}' was not found on the server."
        )

    return FileResponse(
        path=str(target_path),
        media_type="application/pdf",
        filename=filename
    )
