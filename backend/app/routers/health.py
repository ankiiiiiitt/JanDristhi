from fastapi import APIRouter
from datetime import datetime, timezone
from app.config import settings
from app.database.mongodb import db_manager
from app.services.ai_bridge import ai_bridge

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("")
async def get_health_status():
    """Returns system status, active database connection state, and AI mode."""
    ai_status = ai_bridge.get_status()
    db_connected = db_manager.is_connected
    is_prod = settings.ENVIRONMENT.lower() == "production"

    # Overall system health: in production without DB connection, report degraded
    overall_status = "degraded" if is_prod and not db_connected else "healthy"

    return {
        "status": overall_status,
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "database": "connected" if db_connected else "mock_store",
        "database_connected": db_connected,
        "database_storage_engine": "mongodb_atlas" if db_connected else "in_memory_mock_fallback",
        "database_cluster_host": db_manager.get_sanitized_host(),
        "database_persistent_storage": db_connected,
        "database_error": db_manager.connection_error if not db_connected else None,
        "production_warning": (
            "CRITICAL: Running on ephemeral mock storage in production! "
            "Persisted records will be lost on container restart. "
            "Configure MONGODB_URI in Render dashboard."
            if is_prod and not db_connected else None
        ),
        "ai_engine": ai_status.get("ai_engine", "online"),
        "ai_model_loaded": ai_status.get("model_loaded", False),
        "ai_model_path": ai_status.get("model_path"),
        "mock_mode": settings.MOCK_MODE or not db_connected,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@router.get("/database")
async def get_database_diagnostics():
    """Returns in-depth database health, collection metrics, and sanitized connection diagnostics."""
    return await db_manager.get_health_report()

