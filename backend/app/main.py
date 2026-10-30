import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.config import settings
from app.database.mongodb import db_manager
from app.routers import health, auth, observations, road_segments, risk, repairs, collector, reports

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("jandrishti.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to MongoDB Atlas
    logger.info("Initializing JanDrishti Urban Infrastructure Platform...")
    await db_manager.connect_to_database()
    yield
    # Shutdown: Close database connections
    await db_manager.close_database_connection()
    logger.info("JanDrishti platform gracefully shut down.")

app = FastAPI(
    title="JanDrishti – AI Urban Infrastructure Intelligence API",
    description="Predictive Road Health, Multi-Hazard Fusion & Municipal Infrastructure Platform",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
raw_origins = [o for o in settings.BACKEND_CORS_ORIGINS if "*" not in o]
explicit_origins = list(set(raw_origins + [
    "https://frontend-three-rosy-80.vercel.app",
    "http://localhost:5199",
    "http://localhost:5173",
    "http://localhost:3000",
]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=explicit_origins,
    allow_origin_regex=r"https://.*\.vercel\.app|https://.*\.onrender\.com|https://.*\.railway\.app|http://localhost:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory for static image & video serving
uploads_path = Path(settings.UPLOAD_STORAGE_DIR)
uploads_path.mkdir(parents=True, exist_ok=True)
(uploads_path / "videos").mkdir(parents=True, exist_ok=True)
(uploads_path / "extracted_frames").mkdir(parents=True, exist_ok=True)
(uploads_path / "collector").mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_path)), name="uploads")

# Include Routers under API_PREFIX
app.include_router(health.router, prefix=settings.API_PREFIX)
app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(observations.router, prefix=settings.API_PREFIX)
app.include_router(road_segments.router, prefix=settings.API_PREFIX)
app.include_router(risk.router, prefix=settings.API_PREFIX)
app.include_router(repairs.router, prefix=settings.API_PREFIX)
app.include_router(collector.router, prefix=settings.API_PREFIX)
app.include_router(reports.router, prefix=settings.API_PREFIX)

@app.get("/")
async def root():
    return {
        "platform": "JanDrishti",
        "description": "Predictive Urban Infrastructure Intelligence",
        "docs": "/docs",
        "api_v1": settings.API_PREFIX
    }

# Standardized Global Error Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception at {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred while processing the request.",
                "details": str(exc) if settings.ENVIRONMENT == "development" else {}
            }
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        reload=True
    )

