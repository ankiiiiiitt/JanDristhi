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
    return {
        "status": "healthy",
        "version": "1.0.0",
        "database": "connected" if db_manager.is_connected else "mock_store",
        "ai_engine": ai_status.get("ai_engine", "online"),
        "ai_model_loaded": ai_status.get("model_loaded", False),
        "ai_model_path": ai_status.get("model_path"),
        "mock_mode": settings.MOCK_MODE or not db_manager.is_connected,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

