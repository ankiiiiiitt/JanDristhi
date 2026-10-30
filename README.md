# JanDrishti – AI Predictive Urban Infrastructure Intelligence

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB.svg?style=flat&logo=react)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/CSS-Tailwind-38B2AC.svg?style=flat&logo=tailwind-css)](https://tailwindcss.com)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB%20Atlas-47A248.svg?style=flat&logo=mongodb)](https://mongodb.com)
[![YOLO](https://img.shields.io/badge/AI-YOLOv8%20%2B%20OpenCV-FF6F00.svg?style=flat)](https://ultralytics.com)
[![Leaflet](https://img.shields.io/badge/GIS-Leaflet%20%2B%20OSM-199900.svg?style=flat&logo=leaflet)](https://leafletjs.com)

**JanDrishti** ("The People's Vision") is a collaborative, modular urban infrastructure intelligence platform built for hackathon execution. It automates road damage detection from vehicle telemetry, quantifies structural degradation using Multi-Hazard Fusion, and delivers a predictive municipal command dashboard with closed-loop repair verification.

---

## 1. Modular Monorepo Architecture

To allow all five developers to build concurrently without merge conflicts or blocking dependencies, the codebase is strictly decoupled:

```
JanDrishti/
├── frontend/               # Developer 1: React + Vite + Tailwind + Leaflet UI
│   ├── src/
│   │   ├── components/     # RoadMap, MetricCards, Analytics, RepairAudit, UploadModal
│   │   ├── services/       # api.js (with auto-fallback to mockData.js)
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
├── backend/                # Developer 3 & 4: Python + FastAPI + MongoDB Atlas
│   ├── app/
│   │   ├── database/       # mongodb.py connection manager & seed_data.py
│   │   ├── models/         # Pydantic v2 schemas for all 6 collections
│   │   ├── routers/        # auth, observations, road_segments, risk, repairs, health
│   │   ├── services/       # ai_bridge.py, mock_store.py
│   │   ├── config.py       # pydantic-settings environment config
│   │   └── main.py         # FastAPI application entrypoint & CORS
│   └── requirements.txt
├── ai-engine/              # Developer 2: YOLOv8 + OpenCV + Multi-Hazard Risk
│   ├── detector.py         # YOLO road damage detector (with heuristic fallback)
│   ├── image_processor.py  # CLAHE contrast enhancement & BBox visualizer
│   ├── risk_predictor.py   # Multi-Hazard Fusion algorithm
│   ├── cli.py              # Standalone CLI runner for AI testing
│   └── requirements.txt
├── docs/                   # Shared Documentation & Contracts
│   ├── API_CONTRACT.md     # Official API endpoints, payloads & MongoDB fields
│   ├── GIT_WORKFLOW.md     # Git commands, branching, PRs & conflict resolution
│   └── ARCHITECTURE.md     # Multi-Hazard Fusion pipeline & system design
├── tests/                  # Developer 5: Integration & Unit Tests
│   ├── test_backend.py     # FastAPI endpoint verification
│   ├── test_ai_engine.py   # AI damage detection & scoring unit tests
│   └── test_integration.py # End-to-end 9-stage lifecycle test
├── scripts/                # Shared Developer Automation
│   ├── simulate_vehicle_telemetry.py  # Dev 5: Vehicle GPS & Z-shock telemetry simulator
│   ├── seed_db.py          # Dev 4: MongoDB Atlas seeder
│   └── start_all.sh        # One-command integrated startup
├── .env.example            # Environment variables template
├── .gitignore              # Multi-stack gitignore
└── README.md
```

---

## 2. Team Responsibilities & Ownership Matrix

| Developer | Core Role | Assigned Branch | Primary Directory Ownership | Key Deliverables |
|---|---|---|---|---|
| **Dev 1** | Frontend Architect | `feature/frontend` | `frontend/` | Dashboard KPIs, Leaflet Map integration, Analytics charts, Repair UI |
| **Dev 2** | AI / ML Specialist | `feature/ai-detection` | `ai-engine/` | YOLO road damage detection, OpenCV CLAHE, Multi-Hazard Fusion score |
| **Dev 3** | Backend Engineer | `feature/backend` | `backend/app/routers/`, `backend/app/main.py` | FastAPI setup, REST API endpoints, JWT auth, Error handling |
| **Dev 4** | Database & GIS Lead | `feature/database-gis` | `backend/app/database/`, `backend/app/models/` | MongoDB Atlas schemas, 2dsphere indexes, GeoJSON road endpoints |
| **Dev 5** | Data & QA Engineer | `feature/data-collection` | `tests/`, `scripts/` | Camera/GPS ingestion, Telemetry simulator, Closed-loop repair audit |

---

## 3. GitHub Collaboration & Git Workflow

### 3.1 Branching Strategy
- **`main`**: Production-ready, stable demo releases only.
- **`develop`**: Central integration branch where feature branches merge.
- **`feature/*`**: Individual developer branches:
  - `feature/frontend`
  - `feature/ai-detection`
  - `feature/backend`
  - `feature/database-gis`
  - `feature/data-collection`

### 3.2 Git Commands Cheat Sheet

#### Initial Setup & Cloning
```bash
git clone https://github.com/<your-org>/JanDrishti.git
cd JanDrishti
cp .env.example .env
git checkout develop
```

#### Creating & Working on Your Feature Branch
```bash
# Example for Developer 1 (Frontend):
git checkout -b feature/frontend origin/develop

# Stage changes strictly inside your module:
git add frontend/
git commit -m "feat(frontend): connect Leaflet map with GeoJSON health endpoint"
git push -u origin feature/frontend
```

#### Syncing with Latest `develop` Before Pull Request
```bash
git checkout feature/frontend
git fetch origin
git merge origin/develop
# Test your module, then push:
git push origin feature/frontend
```

#### Resolving Merge Conflicts
If Git reports a conflict during merge:
1. Run `git status` to locate files marked as `both modified`.
2. Open the file, inspect conflict markers (`<<<<<<< HEAD`, `=======`, `>>>>>>> develop`), and keep the intended integration logic.
3. Mark resolved:
   ```bash
   git add <resolved-file>
   git commit -m "fix(merge): resolve conflict with develop"
   git push origin <your-feature-branch>
   ```

---

## 4. Shared Database: MongoDB Atlas Setup (Developer 4)

JanDrishti requires six core collections in MongoDB Atlas:
1. `users`: Administrative and municipal credentials with role-based access.
2. `vehicles`: Fleet telemetry metadata and last known coordinates.
3. `observations`: Telemetry records, camera frames, accelerometer Z-shocks, and AI detections.
4. `road_segments`: Urban street stretches with GeoJSON LineStrings and Health Scores (0-100).
5. `risk_assessments`: Multi-Hazard Fusion predictions and recommended interventions.
6. `repair_records`: Before/after audit photos, contractor sign-offs, and AI verification.

### Configuring MongoDB Credentials
1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Allow access from your IP address under **Network Access**.
3. In `.env`, set:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   MONGODB_DB_NAME=jandrishti_dev
   ```
4. Run the database seed script to populate sample Bangalore roads:
   ```bash
   python scripts/seed_db.py
   ```
*(Note: If MongoDB Atlas credentials are not yet configured, the system automatically falls back to the in-memory mock store so no developer is blocked!)*

---

## 5. Development Workflow (Running Modules Independently)

Every developer can run their assigned module in isolation:

### Module 1: Frontend Developer (React + Vite)
```bash
cd frontend
npm install
npm run dev
# Accessible at: http://localhost:5173
```
*Note: If backend is offline, frontend seamlessly runs in Mock Mode using `frontend/src/services/mockData.js`.*

### Module 2: AI / ML Developer (YOLO & Risk Fusion)
```bash
cd ai-engine
# Run standalone detection & multi-hazard fusion on any image:
python cli.py --image path/to/sample_road.jpg --z-shock 3.5
```

### Module 3: Backend Developer (FastAPI)
```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
# Interactive API Documentation: http://localhost:8000/docs
```

### Module 4: Database & GIS Developer (MongoDB Seeding & GeoJSON Inspection)
```bash
# Seed or reset MongoDB collections:
python scripts/seed_db.py

# Test GeoJSON generation via CLI or cURL:
curl http://localhost:8000/api/v1/roads/geojson
```

### Module 5: Data Collection & Testing (Simulator & Test Suite)
```bash
# Run automated telemetry simulator:
python scripts/simulate_vehicle_telemetry.py 5

# Run end-to-end integration and unit test suite:
pytest tests/
```

### Integrated Full-Stack Startup (All Modules)
To start both backend and frontend concurrently:
```bash
./scripts/start_all.sh
```

---

## 6. End-to-End Functional Integration Flow

The platform executes a 9-stage closed-loop intelligence lifecycle:

```
[1. Vehicle Data Collection]
   Fleet vehicle / phone app captures road frame + GPS + Accelerometer Z-Shock.
            │
            ▼
[2. AI Road Damage Detection]
   YOLO classifies damage: Pothole (D00), Alligator Cracking (D10), Longitudinal (D20), Transverse (D40).
   OpenCV estimates surface area (m²) and severity.
            │
            ▼
[3. GPS Location & Snapping]
   Matched to nearest urban road segment in MongoDB using geospatial indexes.
            │
            ▼
[4. MongoDB Atlas Storage]
   Observation and telemetry written to `observations` collection.
            │
            ▼
[5. Multi-Hazard Fusion]
   Composite evaluation of: Damage Area + Z-Shock Vibration + Monsoon Drainage Risk + Heavy Traffic.
            │
            ▼
[6. Infrastructure Health Score]
   Computes Infrastructure Health Score (IHS) (0-100) and 30-Day Failure Probability (0.00-1.00).
            │
            ▼
[7. Risk Prediction]
   Classifies urgency: Routine Monitoring, Patching Required, or Emergency Resurfacing.
            │
            ▼
[8. Municipal Dashboard]
   Leaflet/OSM renders color-coded streets (Green >75, Amber 50-75, Red <50) with clickable popups.
            │
            ▼
[9. Repair Verification]
   Contractor submits post-resurfacing photo; AI verifies pothole is eliminated and updates record to `verified_closed`.
```

---

## 7. Task Checklist for All Five Developers

### Developer 1 – Frontend (React + Vite + Leaflet)
- [x] Configure Tailwind CSS and Lucide React design system.
- [x] Implement KPI Metric Cards for monitored kilometers and critical hazards.
- [x] Implement Leaflet OpenStreetMap with GeoJSON LineString color rendering.
- [x] Build Hazard Breakdown and Ward Health analytics widgets.
- [x] Build Field Observation Ingestion modal with GPS telemetry inputs.
- [x] Build Closed-loop Repair Verification audit view with Before/After inspection.
- [x] Implement graceful mock data fallback in `frontend/src/services/api.js`.

### Developer 2 – AI / ML (YOLO + OpenCV + Multi-Hazard)
- [x] Design `RoadDamageDetector` with support for classes `D00`, `D10`, `D20`, `D40`.
- [x] Implement OpenCV CLAHE preprocessing and bounding box visualizer.
- [x] Build `MultiHazardRiskPredictor` combining damage severity, vibration, and monsoon risk.
- [x] Implement standalone CLI tool (`ai-engine/cli.py`) for offline model testing.
- [x] Provide AI repair verification logic comparing before/after surface restoration.

### Developer 3 – Backend (FastAPI + Architecture)
- [x] Initialize FastAPI application with lifespan context manager and CORS middleware.
- [x] Implement JWT Authentication router (`POST /api/v1/auth/login`, `GET /api/v1/auth/me`).
- [x] Implement Ingestion router (`POST /api/v1/observations/upload`).
- [x] Implement Analytics and Risk routers (`GET /api/v1/analytics/overview`, `POST /api/v1/risk/evaluate/{id}`).
- [x] Enforce standardized API envelope and error formatting matching `docs/API_CONTRACT.md`.

### Developer 4 – Database & GIS (MongoDB Atlas + Leaflet)
- [x] Configure MongoDB Atlas connection manager with connection pooling and graceful mock fallback.
- [x] Define Pydantic models for all 6 collections (`users`, `vehicles`, `observations`, `road_segments`, `risk_assessments`, `repair_records`).
- [x] Create geospatial `2dsphere` indexes on `observations.location` and `road_segments.geometry`.
- [x] Build GeoJSON road segment endpoint (`GET /api/v1/roads/geojson`) with color coding properties.
- [x] Write standalone database seeding utility (`backend/app/database/seed_data.py`).

### Developer 5 – Data Collection & Testing (Simulator & QA)
- [x] Build vehicle telemetry and GPS simulator (`scripts/simulate_vehicle_telemetry.py`).
- [x] Implement multipart image and sensor ingestion endpoint in backend.
- [x] Build closed-loop repair verification workflow (`POST /api/v1/repairs/verify/{repair_id}`).
- [x] Write automated Pytest test suite for FastAPI backend (`tests/test_backend.py`).
- [x] Write unit tests for AI detector and risk predictor (`tests/test_ai_engine.py`).
- [x] Write end-to-end 9-stage lifecycle integration test (`tests/test_integration.py`).

