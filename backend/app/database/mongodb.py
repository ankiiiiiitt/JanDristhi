import logging
from typing import Optional
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings
from app.services.mock_store import mock_store

logger = logging.getLogger("jandrishti.db")

class MongoDBManager:
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None
    is_connected: bool = False

    async def connect_to_database(self):
        """Connects to MongoDB Atlas cluster with timeout check and fallback."""
        if settings.MOCK_MODE:
            logger.info("MOCK_MODE=true: Running with in-memory database store.")
            self.is_connected = False
            return

        try:
            logger.info("Connecting to MongoDB Atlas...")
            # Set short server selection timeout for responsive startup during local dev
            self.client = AsyncIOMotorClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=2500,
                maxPoolSize=settings.MONGODB_MAX_POOL_SIZE,
                minPoolSize=settings.MONGODB_MIN_POOL_SIZE
            )
            # Ping database to verify connection
            await self.client.admin.command('ping')
            self.db = self.client[settings.MONGODB_DB_NAME]
            self.is_connected = True
            logger.info("Successfully connected to MongoDB Atlas!")
            await self._ensure_indexes()
        except Exception as e:
            logger.warning(
                f"Could not connect to MongoDB Atlas ({e}). "
                "Activating transparent fallback to mock data store so development is not blocked."
            )
            self.is_connected = False

    async def close_database_connection(self):
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed.")

    async def _ensure_indexes(self):
        """Creates 2dsphere and unique indexes required by Developer 4."""
        if not self.is_connected or not self.db:
            return
        try:
            # Users collection
            await self.db.users.create_index("user_id", unique=True)
            await self.db.users.create_index("email", unique=True)

            # Vehicles collection
            await self.db.vehicles.create_index("vehicle_id", unique=True)
            await self.db.vehicles.create_index([("last_known_location", "2dsphere")])

            # Observations collection
            await self.db.observations.create_index("observation_id", unique=True)
            await self.db.observations.create_index([("location", "2dsphere")])
            await self.db.observations.create_index("linked_segment_id")

            # Road segments
            await self.db.road_segments.create_index("segment_id", unique=True)
            await self.db.road_segments.create_index([("geometry", "2dsphere")])

            # Risk assessments
            await self.db.risk_assessments.create_index("assessment_id", unique=True)
            await self.db.risk_assessments.create_index("segment_id")

            # Repair records
            await self.db.repair_records.create_index("repair_id", unique=True)
            await self.db.repair_records.create_index("segment_id")
            logger.info("Database indexes successfully verified/created.")
        except Exception as e:
            logger.error(f"Error ensuring indexes: {e}")

    def get_collection(self, collection_name: str):
        if self.is_connected and self.db is not None:
            return self.db[collection_name]
        return None

db_manager = MongoDBManager()
