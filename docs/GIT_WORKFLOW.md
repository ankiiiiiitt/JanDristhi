# JanDrishti – Git Collaboration & Branching Strategy

This document establishes the collaboration protocol for the 5-developer hackathon team to prevent code collisions, merge overwrites, or broken integration builds.

---

## 1. Branching Topology

```
[main]          <-- Production-stable releases only (demo-ready)
   ^
   |  (via PR after full integration test)
   |
[develop]       <-- Integration branch (all feature branches merge here)
   ^
   |-- [feature/frontend]          (Developer 1 - React/Vite/Tailwind UI)
   |-- [feature/ai-detection]      (Developer 2 - YOLO/OpenCV/Risk ML)
   |-- [feature/backend]           (Developer 3 - FastAPI/Auth/Endpoints)
   |-- [feature/database-gis]      (Developer 4 - MongoDB/GeoJSON/Leaflet DB)
   `-- [feature/data-collection]   (Developer 5 - Telemetry/Sensors/Tests)
```

---

## 2. Developer Module Ownership Directory Mapping

To prevent merge conflicts, each developer has primary write ownership of their dedicated directory. **Never edit files outside your assigned module without informing the team!**

| Developer | Feature Branch | Primary Directory Ownership |
|---|---|---|
| **Dev 1 (Frontend)** | `feature/frontend` | `frontend/` |
| **Dev 2 (AI/ML)** | `feature/ai-detection` | `ai-engine/` |
| **Dev 3 (Backend)** | `feature/backend` | `backend/app/routers/`, `backend/app/main.py` |
| **Dev 4 (Database & GIS)** | `feature/database-gis` | `backend/app/database/`, `backend/app/models/` |
| **Dev 5 (Data & Testing)** | `feature/data-collection` | `tests/`, `scripts/` |
| **Shared (Architect / Lead)**| `develop` / `main` | `docs/`, `.env.example`, `README.md` |

---

## 3. Step-by-Step Git Commands Reference

### 3.1 Initial Setup (Every Developer)
```bash
# 1. Clone the shared repository
git clone https://github.com/<your-org>/JanDrishti.git
cd JanDrishti

# 2. Fetch all remote branches
git fetch origin

# 3. Checkout develop branch
git checkout develop

# 4. Copy environment configuration
cp .env.example .env
```

### 3.2 Switching to Your Assigned Feature Branch
```bash
# Developer 1:
git checkout -b feature/frontend origin/develop

# Developer 2:
git checkout -b feature/ai-detection origin/develop

# Developer 3:
git checkout -b feature/backend origin/develop

# Developer 4:
git checkout -b feature/database-gis origin/develop

# Developer 5:
git checkout -b feature/data-collection origin/develop
```

### 3.3 Daily Development Cycle (Commit & Push)
```bash
# Check modified files in your directory
git status

# Stage only files in your module (DO NOT use git add . blindly!)
git add frontend/   # (example for Dev 1)

# Commit with a clear, conventional message
git commit -m "feat(frontend): implement Leaflet map road segment color coding"

# Push to your remote feature branch
git push origin feature/frontend
```

### 3.4 Syncing with Latest `develop` (Do this before opening a PR!)
To keep your branch up-to-date and catch conflicts early:
```bash
# 1. Fetch latest changes from remote
git fetch origin

# 2. Rebase or merge develop into your feature branch
git checkout feature/frontend
git merge origin/develop

# 3. If no conflicts, push your updated feature branch
git push origin feature/frontend
```

---

## 4. How to Resolve Merge Conflicts (Step-by-Step)

If Git detects conflicting edits between your branch and `develop`:

1. **Identify the conflicting files:**
   ```bash
   git status
   # Conflicting files will be marked as "both modified"
   ```

2. **Open the conflicting file** in your IDE. You will see markers:
   ```text
   <<<<<<< HEAD (Your changes)
   const API_BASE_URL = "http://localhost:8000/api/v1";
   =======
   const API_BASE_URL = process.env.VITE_API_BASE_URL || "/api/v1";
   >>>>>>> develop (Incoming changes)
   ```

3. **Resolve the conflict** by preserving the correct integrated logic and removing the `<<<<<<<`, `=======`, and `>>>>>>>` lines.

4. **Mark as resolved and complete the merge:**
   ```bash
   git add <resolved-file-path>
   git commit -m "fix(merge): resolve conflict between feature branch and develop"
   git push origin <your-feature-branch>
   ```

---

## 5. Pull Request (PR) Checklist Before Merging into `develop`

Before clicking **"Merge Pull Request"** on GitHub:
- [ ] Code strictly follows `docs/API_CONTRACT.md`.
- [ ] No secrets or `.env` files are staged or committed.
- [ ] The module runs standalone without errors (`npm run build` or `pytest`).
- [ ] At least one peer developer has reviewed and approved the PR.
- [ ] Merge strategy: Use **"Squash and merge"** or standard non-fast-forward merge to keep git history clean.
