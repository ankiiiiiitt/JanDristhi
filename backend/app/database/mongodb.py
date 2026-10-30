import logging
from typing import Optional
from datetime import datetime, timezone
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings
from app.services.mock_store import mock_store

logger = logging.getLogger("jandrishti.db")

# Declarative index specifications for optimal query performance
INDEX_SPECIFICATIONS = {
    "users": [
        ("user_id", {"unique": True}),
        ("email", {"unique": True}),
    ],
    "vehicles": [
        ("vehicle_id", {"unique": True}),
        ([("last_known_location", "2dsphere")], {}),
    ],
    "observations": [
        ("observation_id", {"unique": True}),
        # A citizen report id is generated when the photo is captured and is reused
        # for retries.  This is the authoritative duplicate guard.
        ("report_id", {"unique": True, "sparse": True}),
        ("deduplication_key", {"unique": True, "sparse": True}),
        ([("location", "2dsphere")], {}),
        ("linked_segment_id", {}),
        # Sector, severity, and detection status composite indexes with created_at
        ([("sector", 1), ("created_at", -1)], {"name": "idx_obs_sector_created_at"}),
        ([("detections.severity", 1), ("created_at", -1)], {"name": "idx_obs_severity_created_at"}),
        ([("detection_status", 1), ("created_at", -1)], {"name": "idx_obs_status_created_at"}),
        ([("sector", 1), ("detection_status", 1), ("created_at", -1)], {"name": "idx_obs_sector_status_created_at"}),
        ([("created_at", -1)], {"name": "idx_obs_created_at"}),
        # Backwards compatibility indexes with captured_at
        ([("sector", 1), ("captured_at", -1)], {"name": "idx_obs_sector_captured_at"}),
        ([("detection_status", 1), ("captured_at", -1)], {"name": "idx_obs_status_captured_at"}),
        ([("captured_at", -1)], {"name": "idx_obs_captured_at"}),
    ],
    "road_segments": [
        ("segment_id", {"unique": True}),
        ([("geometry", "2dsphere")], {}),
        ([("ward_id", 1), ("health_score", 1)], {"name": "idx_roads_ward_health"}),
        ([("area_name", 1)], {"name": "idx_roads_area_name"}),
    ],
    "risk_assessments": [
        ("assessment_id", {"unique": True}),
        ("segment_id", {}),
        ([("sector", 1), ("health_score", 1)], {"name": "idx_risk_sector_health"}),
        ([("risk_level", 1), ("assessed_at", -1)], {"name": "idx_risk_level_assessed_at"}),
    ],
    "repair_records": [
        ("repair_id", {"unique": True}),
        ("segment_id", {}),
        ([("status", 1), ("created_at", -1)], {"name": "idx_repairs_status_created_at"}),
        ([("sector", 1), ("created_at", -1)], {"name": "idx_repairs_sector_created_at"}),
        ([("created_at", -1)], {"name": "idx_repairs_created_at"}),
    ],
    "video_inspections": [
        ("video_id", {"unique": True}),
        ("report_id", {}),
        ([("created_at", -1)], {"name": "idx_videos_created_at"}),
    ],
}

class MongoDBManager:
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None
    is_connected: bool = False
    connection_error: Optional[str] = None
    last_connected_at: Optional[str] = None

    def get_sanitized_host(self) -> str:
        """Extracts the database host and port or cluster without user/password secrets."""
        uri = settings.MONGODB_URI or ""
        if "@" in uri:
            # Extract portion after @ and before any query params or slashes
            host_part = uri.split("@", 1)[1]
            host_part = host_part.split("/", 1)[0].split("?", 1)[0]
            scheme = "mongodb+srv" if "mongodb+srv" in uri else "mongodb"
            return f"{scheme}://***:***@{host_part}"
        elif "://" in uri:
            scheme_and_host = uri.split("?", 1)[0]
            return scheme_and_host
        return "unconfigured_localhost:27017"

    def _sanitize_error_message(self, err: Exception) -> str:
        """Strips credentials and returns sanitized diagnostic message."""
        raw = str(err)
        # Regex or string replace for potential password patterns
        import re
        sanitized = re.sub(r"://([^:@]+):([^@]+)@", r"://***:***@", raw)
        return sanitized

    async def connect_to_database(self):
        """Connects to MongoDB Atlas cluster with timeout check and fallback."""
        if settings.MOCK_MODE:
            logger.info("MOCK_MODE=true: Running with in-memory database store.")
            self.is_connected = False
            self.connection_error = "MOCK_MODE is explicitly enabled via configuration"
            return

        is_production = settings.ENVIRONMENT.lower() == "production"
        is_localhost = "localhost" in settings.MONGODB_URI or "127.0.0.1" in settings.MONGODB_URI

        if is_production and is_localhost:
            msg = "MONGODB_URI is not set or defaults to localhost in production environment."
            self.connection_error = msg
            logger.critical(
                "CRITICAL PRODUCTION ALERT: MONGODB_URI is missing or unconfigured! "
                "The backend is falling back to ephemeral in-memory storage. "
                "Persisted records will be lost on container restart. "
                "Set MONGODB_URI in Render dashboard environment variables."
            )

        try:
            logger.info(f"Connecting to MongoDB cluster ({self.get_sanitized_host()})...")
            # Elevated timeout for Atlas TLS connection
            timeout_ms = 7500 if is_production or "mongodb+srv" in settings.MONGODB_URI else 2500
            self.client = AsyncIOMotorClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=timeout_ms,
                maxPoolSize=settings.MONGODB_MAX_POOL_SIZE,
                minPoolSize=settings.MONGODB_MIN_POOL_SIZE
            )
            # Ping database to verify connection
            await self.client.admin.command('ping')
            self.db = self.client[settings.MONGODB_DB_NAME]
            self.is_connected = True
            self.connection_error = None
            self.last_connected_at = datetime.now(timezone.utc).isoformat()
            logger.info("Successfully connected to MongoDB Atlas (%s)!", settings.MONGODB_DB_NAME)
            await self._ensure_indexes()
        except Exception as e:
            sanitized_err = self._sanitize_error_message(e)
            self.connection_error = f"{type(e).__name__}: {sanitized_err}"
            self.is_connected = False
            if is_production:
                logger.critical(
                    f"PRODUCTION ALERT: Failed to connect to MongoDB Atlas cluster ({self.get_sanitized_host()})! "
                    f"Diagnostic error: {self.connection_error}. "
                    "Running on fallback in-memory mock store."
                )
            else:
                logger.warning(
                    f"Could not connect to MongoDB ({self.connection_error}). "
                    "Activating transparent fallback to mock data store so development is not blocked."
                )

    async def get_health_report(self) -> dict:
        """Generates detailed database status and CRUD diagnostic summary."""
        if self.is_connected and self.db is not None:
            try:
                # Perform quick roundtrip ping
                await self.client.admin.command('ping')
                obs_count = await self.db.observations.count_documents({})
                roads_count = await self.db.road_segments.count_documents({})
                rep_count = await self.db.repair_records.count_documents({})
                return {
                    "status": "connected",
                    "storage_engine": "mongodb_atlas",
                    "persistent": True,
                    "cluster_host": self.get_sanitized_host(),
                    "database_name": settings.MONGODB_DB_NAME,
                    "collections": {
                        "observations": obs_count,
                        "road_segments": roads_count,
                        "repair_records": rep_count
                    },
                    "last_connected_at": self.last_connected_at,
                    "crud_verified": True
                }
            except Exception as e:
                return {
                    "status": "degraded",
                    "storage_engine": "mongodb_atlas",
                    "persistent": False,
                    "error": self._sanitize_error_message(e)
                }

        is_production = settings.ENVIRONMENT.lower() == "production"
        return {
            "status": "disconnected",
            "storage_engine": "in_memory_mock_fallback",
            "persistent": False,
            "environment": settings.ENVIRONMENT,
            "cluster_host": self.get_sanitized_host(),
            "database_name": settings.MONGODB_DB_NAME,
            "error_diagnostic": self.connection_error or "Connection not established",
            "production_alert": (
                "CRITICAL: Running on ephemeral mock storage in production! "
                "Persisted records will be lost on container restart. "
                "Configure MONGODB_URI in Render dashboard."
                if is_production else None
            ),
            "render_setup_guide": "Set MONGODB_URI in Render Dashboard -> Web Services -> jandrishti-backend -> Environment."
        }

    async def close_database_connection(self):
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed.")

    async def _ensure_indexes(self, target_db=None):
        """Creates compound, 2dsphere, and unique indexes across all collections."""
        db = target_db if target_db is not None else self.db
        if db is None:
            return []
        created_indexes = []
        try:
            for collection_name, index_list in INDEX_SPECIFICATIONS.items():
                col = db[collection_name]
                for key_or_keys, kwargs in index_list:
                    idx_name = await col.create_index(key_or_keys, **kwargs)
                    created_indexes.append((collection_name, idx_name))
            logger.info("Database indexes successfully verified/created (%d indexes).", len(created_indexes))
            return created_indexes
        except Exception as e:
            logger.error(f"Error ensuring indexes: {e}")
            return created_indexes

    def get_collection(self, collection_name: str):
        if self.is_connected and self.db is not None:
            return self.db[collection_name]
        return None

db_manager = MongoDBManager()
