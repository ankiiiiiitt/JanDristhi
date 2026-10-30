#!/usr/bin/env python3
"""
JanDrishti – Comprehensive Architecture & Technology Manual Generator
Generates a publication-grade PDF report documenting every layer of the platform.
"""

import os
import sys
from pathlib import Path
from datetime import datetime

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas to dynamically compute and draw total page numbers."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        # Skip headers/footers on cover page
        if self._pageNumber > 1:
            # Running Header
            self.drawString(54, 750, "JanDrishti – Predictive Urban Infrastructure Intelligence Platform")
            self.drawRightString(612 - 54, 750, "Technical Architecture & Systems Manual")
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(54, 742, 612 - 54, 742)

            # Running Footer
            page_str = f"Page {self._pageNumber} of {page_count}"
            self.drawRightString(612 - 54, 36, page_str)
            self.drawString(54, 36, "CONFIDENTIAL & PROPRIETARY – HACKATHON CORE SPECIFICATION")
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(54, 46, 612 - 54, 46)

        self.restoreState()

def create_pdf(output_filename="JanDrishti_Technical_Manual.pdf"):
    doc = SimpleDocTemplate(
        output_filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom Palettes
    PRIMARY = colors.HexColor("#0f172a")     # Slate 900
    ACCENT_EMERALD = colors.HexColor("#059669") # Emerald 600
    ACCENT_BLUE = colors.HexColor("#0284c7")    # Sky 600
    TEXT_DARK = colors.HexColor("#1e293b")      # Slate 800
    TEXT_MUTED = colors.HexColor("#64748b")     # Slate 500
    BG_LIGHT = colors.HexColor("#f8fafc")       # Slate 50
    BORDER_LIGHT = colors.HexColor("#e2e8f0")   # Slate 200

    # Custom Paragraph Styles
    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=28,
        leading=34,
        textColor=PRIMARY,
        spaceAfter=8
    )

    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=13,
        leading=18,
        textColor=ACCENT_EMERALD,
        spaceAfter=20
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=PRIMARY,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=ACCENT_BLUE,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=TEXT_DARK,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=TEXT_DARK,
        leftIndent=14,
        spaceAfter=4
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=TEXT_DARK
    )

    table_code_style = ParagraphStyle(
        'TableCode',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.5,
        leading=10,
        textColor=PRIMARY
    )

    story = []

    # =========================================================================
    # 1. COVER / TITLE PAGE
    # =========================================================================
    story.append(Spacer(1, 40))
    story.append(Paragraph("JanDrishti (जन दृष्टि)", title_style))
    story.append(Paragraph("AI-Based Predictive Urban Infrastructure Intelligence Platform", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=3, color=ACCENT_EMERALD, spaceAfter=20))

    meta_text = """
    <b>Document Classification:</b> Complete Technical Architecture, System Engineering & Operational Guide<br/>
    <b>Author / Lead:</b> Senior Software Architect & Collaborative Technical Lead<br/>
    <b>Team Scope:</b> 5 Concurrent Engineers (Frontend, AI/ML, Backend, Database/GIS, Telemetry/QA)<br/>
    <b>Version:</b> 1.0.0-hackathon (Monorepo Production Baseline)<br/>
    <b>Generated Date:</b> October 2026<br/>
    <b>Core Repositories:</b> Modular Decoupled Monorepo (React, FastAPI, YOLOv8, MongoDB Atlas, Leaflet)
    """
    story.append(Paragraph(meta_text, body_style))
    story.append(Spacer(1, 20))

    # Executive Overview Box
    exec_summary_html = """
    <b>EXECUTIVE SUMMARY & PROBLEM STATEMENT:</b><br/>
    Modern metropolitan roads deteriorate rapidly due to heavy commercial freight transit and torrential monsoon runoff. Traditional municipal road inspections suffer from three fatal bottlenecks:
    <br/><br/>
    <b>1. Slow & Subjective Manual Surveys:</b> Municipalities rely on physical complaint helplines and sporadic manual audits, discovering potholes only after severe traffic accidents or public outcry.
    <br/>
    <b>2. Inability to Predict Failure:</b> Road surface cracks (longitudinal, transverse, alligator) are treated in isolation without fusing vehicular vibration shocks and environmental hydrology factors.
    <br/>
    <b>3. Unverified Contractor Work (Ghost Repairs):</b> Tens of millions of municipal funds are disbursed without scientific verification that contractor resurfacing was successfully completed.
    <br/><br/>
    <b>The JanDrishti Solution:</b> An autonomous, closed-loop urban intelligence platform that converts municipal vehicle fleets (buses, sanitation trucks, patrol vans) into edge-sensing probes. Camera video frames and 3-axis accelerometer telemetry ($Z$-shock) are streamed into a YOLOv8 computer vision detector, fused with geospatial environmental factors to calculate an <b>Infrastructure Health Score (IHS)</b>, rendered on a live municipal Leaflet GIS map, and audited via an AI before/after repair verification engine.
    """
    summary_table = Table([[Paragraph(exec_summary_html, body_style)]], colWidths=[504])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
        ('BOX', (0, 0), (-1, -1), 1, BORDER_LIGHT),
        ('PADDING', (0, 0), (-1, -1), 14),
    ]))
    story.append(summary_table)

    story.append(PageBreak())

    # =========================================================================
    # 2. END-TO-END 9-STAGE FUNCTIONAL PIPELINE
    # =========================================================================
    story.append(Paragraph("1. End-to-End Functional Architecture", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER_LIGHT, spaceAfter=12))

    pipeline_intro = """
    The JanDrishti system operates on a synchronized 9-stage closed-loop data pipeline. Every component communicates via strictly typed API contracts, allowing all modules to operate independently while preserving full-stack data integrity.
    """
    story.append(Paragraph(pipeline_intro, body_style))

    pipeline_stages = [
        ("Stage 1: Vehicle Data Collection (Dev 5)", "Public transit buses, waste collection trucks, and municipal patrol bikes are equipped with smartphone/dashcam units capturing HD road video, GPS coordinates, and 3-axis accelerometer telemetry ($Z$-shock vibration spikes)."),
        ("Stage 2: AI Road Damage Detection (Dev 2)", "Video frames are processed through YOLOv8 models trained on the Global Road Damage Dataset (RDD), identifying Potholes (D00), Alligator Cracking (D10), Longitudinal Cracks (D20), and Transverse Cracks (D40). OpenCV calculates pixel surface area in square meters."),
        ("Stage 3: GPS Snapping & Spatial Routing (Dev 4)", "Raw GPS telemetry coordinates are snapped to the nearest managed road stretch using geospatial MongoDB 2dsphere indexing and Euclidean thresholding."),
        ("Stage 4: MongoDB Atlas Persistence (Dev 4)", "Cleaned observation records containing detected bounding boxes, severity classifications, and telemetry shocks are persisted into the observations collection."),
        ("Stage 5: Multi-Hazard Fusion (Dev 2 & 3)", "The system executes a multi-variate fusion algorithm combining surface damage area, vertical accelerometer impact shocks ($Z$-shock > 3.0 m/s²), monsoon water runoff vulnerability, and heavy vehicle transit frequency."),
        ("Stage 6: Infrastructure Health Score (IHS) (Dev 2 & 3)", "Computes a normalized health score (0–100 scale, where 100 is pristine and 0 is complete structural failure) and calculates 30-day failure probability."),
        ("Stage 7: Risk Classification & Remediation Cost (Dev 2 & 3)", "Categorizes the road stretch into actionable municipal tiers: Routine Monitoring, Patching Required, or Emergency Resurfacing, with automated algorithmic remediation cost estimations in INR."),
        ("Stage 8: Municipal Command Dashboard (Dev 1)", "Interactive Leaflet / OpenStreetMap GIS displays the complete urban road network with color-coded health statuses (Green >75, Amber 50-75, Red <50), clickable popups, and citywide KPI metric cards."),
        ("Stage 9: Closed-Loop Repair Verification (Dev 5 & 1)", "Municipal work orders are issued. Upon contractor repair, a post-resurfacing photo is uploaded; the AI verification engine runs surface difference checks to confirm hazard elimination before authorizing status closure (verified_closed).")
    ]

    stage_data = [[Paragraph(f"<b>{stage[0]}</b>", table_cell_style), Paragraph(stage[1], table_cell_style)] for stage in pipeline_stages]
    stage_table = Table(stage_data, colWidths=[160, 344])
    stage_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), BG_LIGHT),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(stage_table)

    story.append(PageBreak())

    # =========================================================================
    # 3. TECHNOLOGIES USED & TECHNICAL STACK
    # =========================================================================
    story.append(Paragraph("2. Deep-Dive: Technologies Used & Technical Stack", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER_LIGHT, spaceAfter=12))

    tech_intro = """
    JanDrishti is designed as a modular monorepo. Each technological choice was selected specifically for high throughput, asynchronous I/O, low-latency rendering, and rapid hackathon delivery:
    """
    story.append(Paragraph(tech_intro, body_style))

    tech_matrix = [
        ("Layer", "Technology", "Role & Engineering Justification"),
        ("Frontend UI", "React 18 + Vite 5", "High-performance Single Page Application (SPA) with instant Hot Module Replacement (HMR), decoupled service layers, and reactive state management."),
        ("Styling", "Tailwind CSS v3", "Utility-first design system enabling rapid responsive UI, dark-mode styling (Slate-900 palette), and consistent municipal portal aesthetics."),
        ("GIS Mapping", "Leaflet JS + OpenStreetMap", "Client-side interactive vector and raster GIS engine. Renders GeoJSON LineStrings with dynamic color coding, popup bindings, and hazard circle markers without expensive Google Maps API licensing."),
        ("Backend Framework", "Python 3 + FastAPI", "High-throughput asynchronous REST framework powered by Starlette and Uvicorn. Native async/await handles concurrent vehicle telemetry streams with sub-millisecond overhead."),
        ("Validation & Serialization", "Pydantic V2", "Strict runtime request/response validation, automated OpenAPI/Swagger generation, and schema enforcement matching the team's shared API Contract."),
        ("Database Engine", "MongoDB Atlas", "Cloud-native NoSQL document database providing dynamic schema agility for semi-structured sensor telemetry and high-speed write performance."),
        ("Geospatial Engine", "GeoJSON + 2dsphere Indexes", "Native spherical geospatial calculations enabling spatial querying ($near, $geoIntersects) to match vehicle GPS points to road geometries."),
        ("Computer Vision AI", "Ultralytics YOLOv8", "State-of-the-art single-stage convolutional object detection network capable of real-time 30+ FPS edge inference on road surface damage."),
        ("Image Processing", "OpenCV (cv2)", "CLAHE (Contrast Limited Adaptive Histogram Equalization) preprocessing to normalize intense tropical sunlight and deep tree shadows, plus bounding box annotation."),
        ("Predictive AI", "Multi-Hazard Fusion Algorithm", "Multi-factor mathematical scoring model fusing visual damage area, accelerometer $Z$-shock spikes, and monsoon drainage vulnerability indices."),
        ("Testing Suite", "Pytest + TestClient", "Automated test harnesses validating REST endpoints, AI detection fallback logic, and 9-stage end-to-end integration lifecycle flows.")
    ]

    t_data = []
    for idx, row in enumerate(tech_matrix):
        if idx == 0:
            t_data.append([
                Paragraph(f"<b>{row[0]}</b>", table_header_style),
                Paragraph(f"<b>{row[1]}</b>", table_header_style),
                Paragraph(f"<b>{row[2]}</b>", table_header_style)
            ])
        else:
            t_data.append([
                Paragraph(f"<b>{row[0]}</b>", table_cell_style),
                Paragraph(f"<b>{row[1]}</b>", table_code_style),
                Paragraph(row[2], table_cell_style)
            ])

    tech_table = Table(t_data, colWidths=[90, 130, 284])
    tech_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
        ('PADDING', (0, 0), (-1, -1), 5),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BG_LIGHT])
    ]))
    story.append(tech_table)

    story.append(PageBreak())

    # =========================================================================
    # 4. MATHEMATICAL FORMULATION: MULTI-HAZARD FUSION & IHS
    # =========================================================================
    story.append(Paragraph("3. Mathematical Modeling: Multi-Hazard Fusion Engine", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER_LIGHT, spaceAfter=12))

    math_desc = """
    A central architectural innovation of JanDrishti is moving beyond superficial computer vision counts. A pothole in a dry, low-traffic alley presents far less systemic danger than a pothole on an arterial corridor subject to monsoon flooding and heavy commercial axles. 
    <br/><br/>
    The <b>Multi-Hazard Fusion Engine</b> synthesizes four normalized environmental vectors into a unified <b>Composite Risk Index ($R_{\text{composite}}$)</b>:
    """
    story.append(Paragraph(math_desc, body_style))

    # Formula Box
    formula_html = """
    <b>1. Normalized Factor Formulations:</b><br/>
    • <b>Pothole Severity Impact ($I_p$):</b> min(1.0, (Count × 0.3) + (Total Area m² × 0.4))<br/>
    • <b>Crack Fatigue Impact ($I_c$):</b> min(1.0, Crack Count × 0.25)<br/>
    • <b>Vehicular Shock Vibration ($I_v$):</b> min(1.0, max(0.0, ($Z_{\text{shock}} - 1.0) / 4.0))<br/>
    • <b>Monsoon Runoff Vulnerability ($I_m$):</b> Hydrological index (0.0: Elevated ridge, 1.0: Flood-prone basin)<br/>
    <br/>
    <b>2. Composite Multi-Hazard Risk Equation:</b><br/>
    &nbsp;&nbsp;&nbsp;&nbsp;<b>R<sub>composite</sub> = [ (w<sub>p</sub> · I<sub>p</sub>) + (w<sub>c</sub> · I<sub>c</sub>) + (w<sub>v</sub> · I<sub>v</sub>) + (w<sub>m</sub> · I<sub>m</sub>) ] × (0.8 + 0.2 · F<sub>traffic</sub>)</b><br/>
    &nbsp;&nbsp;&nbsp;&nbsp;<i>Default Weights: w<sub>p</sub> = 0.40, w<sub>c</sub> = 0.25, w<sub>v</sub> = 0.20, w<sub>m</sub> = 0.15</i><br/>
    <br/>
    <b>3. Infrastructure Health Score (IHS):</b><br/>
    &nbsp;&nbsp;&nbsp;&nbsp;<b>IHS = max(5.0, 100.0 - (R<sub>composite</sub> × 90.0))</b><br/>
    &nbsp;&nbsp;&nbsp;&nbsp;• <b>IHS &ge; 75:</b> Condition Good (Green) &rarr; Routine Monitoring<br/>
    &nbsp;&nbsp;&nbsp;&nbsp;• <b>50 &le; IHS &lt; 75:</b> Condition Fair (Amber) &rarr; Patching Required<br/>
    &nbsp;&nbsp;&nbsp;&nbsp;• <b>IHS &lt; 50:</b> Condition Critical (Red) &rarr; Emergency Resurfacing
    """
    f_table = Table([[Paragraph(formula_html, body_style)]], colWidths=[504])
    f_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
        ('BOX', (0, 0), (-1, -1), 1, ACCENT_BLUE),
        ('PADDING', (0, 0), (-1, -1), 12),
    ]))
    story.append(f_table)
    story.append(Spacer(1, 14))

    # =========================================================================
    # 5. FIVE-DEVELOPER COLLABORATION & MONOREPO DECOUPLING
    # =========================================================================
    story.append(Paragraph("4. Five-Developer Team Responsibilities & Isolation", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER_LIGHT, spaceAfter=12))

    collab_desc = """
    To prevent code collisions and integration gridlocks during fast-paced hackathons, the monorepo establishes rigid directory boundaries and contract-first interfaces:
    """
    story.append(Paragraph(collab_desc, body_style))

    roles_data = [
        ("Developer", "Branch", "Module Directory", "Core Deliverables & Scope"),
        ("Dev 1: Frontend", "feature/frontend", "frontend/", "React SPA, Leaflet GIS integration, Metric cards, Risk analytics panels, Repair audit view, and mock fallback handlers."),
        ("Dev 2: AI / ML", "feature/ai-detection", "ai-engine/", "YOLOv8 damage classification (D00-D40), OpenCV CLAHE image preprocessor, Multi-Hazard Risk Fusion, and offline CLI runner."),
        ("Dev 3: Backend", "feature/backend", "backend/app/routers/", "FastAPI REST routing, JWT authentication, multipart ingestion endpoints, API contract enforcement, and global error envelope."),
        ("Dev 4: Database/GIS", "feature/database-gis", "backend/app/database/", "MongoDB Atlas connection manager, Pydantic collection schemas, 2dsphere indexes, GeoJSON road endpoints, and database seeder."),
        ("Dev 5: Data & QA", "feature/data-collection", "tests/ & scripts/", "Vehicle GPS & Z-shock telemetry simulator, Pytest test suites, contractor repair verification endpoint, and integration testing.")
    ]

    r_table_data = []
    for idx, r in enumerate(roles_data):
        if idx == 0:
            r_table_data.append([
                Paragraph(f"<b>{r[0]}</b>", table_header_style),
                Paragraph(f"<b>{r[1]}</b>", table_header_style),
                Paragraph(f"<b>{r[2]}</b>", table_header_style),
                Paragraph(f"<b>{r[3]}</b>", table_header_style)
            ])
        else:
            r_table_data.append([
                Paragraph(f"<b>{r[0]}</b>", table_cell_style),
                Paragraph(f"<b>{r[1]}</b>", table_code_style),
                Paragraph(f"<b>{r[2]}</b>", table_code_style),
                Paragraph(r[3], table_cell_style)
            ])

    r_table = Table(r_table_data, colWidths=[90, 95, 105, 214])
    r_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
        ('PADDING', (0, 0), (-1, -1), 5),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BG_LIGHT])
    ]))
    story.append(r_table)

    story.append(PageBreak())

    # =========================================================================
    # 6. DATABASE SCHEMA & API CONTRACT SUMMARY
    # =========================================================================
    story.append(Paragraph("5. Shared Database Collections & API Specifications", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER_LIGHT, spaceAfter=12))

    story.append(Paragraph("<b>5.1 MongoDB Atlas Core Collections (Developer 4):</b>", h2_style))
    db_items = [
        ("users", "User accounts with role-based access: admin, municipal_officer, field_worker, contractor."),
        ("vehicles", "Fleet asset registry with vehicle_type (bus, waste_truck, van) and GeoJSON Point coordinates."),
        ("observations", "Raw telemetry and camera frames containing detected bounding boxes, severity, and telemetry_z_shock."),
        ("road_segments", "Managed urban stretches with GeoJSON LineString coordinates, health_score (0-100), and hazard counts."),
        ("risk_assessments", "Multi-Hazard predictive calculations, 30-day failure probabilities, and estimated repair costs in INR."),
        ("repair_records", "Closed-loop verification tickets with before/after photos and AI surface verification scores.")
    ]
    for name, desc in db_items:
        story.append(Paragraph(f"• <b><font face='Courier'>{name}</font>:</b> {desc}", bullet_style))

    story.append(Spacer(1, 10))
    story.append(Paragraph("<b>5.2 Primary REST API Endpoints (docs/API_CONTRACT.md):</b>", h2_style))

    api_matrix = [
        ("HTTP", "Endpoint Route", "Payload / Parameters", "Description & Response"),
        ("GET", "/api/v1/health", "None", "Returns status of backend, MongoDB Atlas, and AI engine."),
        ("POST", "/api/v1/auth/login", "{email, password}", "Authenticates user and returns JWT Bearer token."),
        ("POST", "/api/v1/observations/upload", "Multipart (image, GPS, Z-shock)", "Ingests road frame, runs YOLO detection, stores observation."),
        ("GET", "/api/v1/roads/geojson", "?ward_id (optional)", "Returns GeoJSON FeatureCollection with health color coding."),
        ("GET", "/api/v1/analytics/overview", "None", "Citywide KPI metrics, hazard breakdown, and ward rankings."),
        ("POST", "/api/v1/risk/evaluate/{id}", "{segment_id}", "Executes Multi-Hazard Fusion algorithm on target stretch."),
        ("POST", "/api/v1/repairs/verify/{id}", "Multipart (after_file)", "AI compares before/after photos to verify pothole elimination.")
    ]

    api_table_data = []
    for idx, a in enumerate(api_matrix):
        if idx == 0:
            api_table_data.append([
                Paragraph(f"<b>{a[0]}</b>", table_header_style),
                Paragraph(f"<b>{a[1]}</b>", table_header_style),
                Paragraph(f"<b>{a[2]}</b>", table_header_style),
                Paragraph(f"<b>{a[3]}</b>", table_header_style)
            ])
        else:
            api_table_data.append([
                Paragraph(f"<b>{a[0]}</b>", table_code_style),
                Paragraph(f"<b>{a[1]}</b>", table_code_style),
                Paragraph(f"<b>{a[2]}</b>", table_cell_style),
                Paragraph(a[3], table_cell_style)
            ])

    api_table = Table(api_table_data, colWidths=[40, 155, 125, 184])
    api_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_LIGHT),
        ('PADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BG_LIGHT])
    ]))
    story.append(api_table)

    story.append(Spacer(1, 14))

    # =========================================================================
    # 7. EXECUTION & OPERATION MANUAL
    # =========================================================================
    story.append(Paragraph("6. Operational Commands & Verification Guide", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER_LIGHT, spaceAfter=12))

    op_text = """
    <b>Running Frontend:</b> <font face='Courier'>cd frontend &amp;&amp; npm run dev</font> &rarr; <font color='#0284c7'>http://localhost:5199</font><br/>
    <b>Running Backend:</b> <font face='Courier'>.venv/bin/uvicorn app.main:app --app-dir backend --port 8199</font> &rarr; <font color='#0284c7'>http://localhost:8199/docs</font><br/>
    <b>Simulating Fleet Ingestion:</b> <font face='Courier'>python3 scripts/simulate_vehicle_telemetry.py 5</font><br/>
    <b>Running AI CLI Engine:</b> <font face='Courier'>python3 ai-engine/cli.py --image road.jpg --z-shock 3.4</font><br/>
    <b>Automated Test Suite:</b> <font face='Courier'>.venv/bin/pytest tests/</font> (All 3 test suites: Backend, AI, Integration pass 100%)
    """
    op_table = Table([[Paragraph(op_text, body_style)]], colWidths=[504])
    op_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
        ('BOX', (0, 0), (-1, -1), 1, ACCENT_EMERALD),
        ('PADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(op_table)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[SUCCESS] PDF Generated at: {output_filename}")

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "JanDrishti_Technical_Manual.pdf"
    create_pdf(out)

