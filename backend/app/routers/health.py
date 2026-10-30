from fastapi import APIRouter
from datetime import datetime, timezone
from app.config import settings
from app.database.mongodb import db_manager

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("")
async def get_health_status():
    """Returns system status, active database connection state, and AI mode."""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "database": "connected" if db_manager.is_connected else "mock_store",
        "ai_engine": "online",
        "mock_mode": settings.MOCK_MODE or not db_manager.is_connected,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
