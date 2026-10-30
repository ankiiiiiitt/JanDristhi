import asyncio
import os
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(backend_dir))

from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
from app.services.mock_store import mock_store

async def seed_mongodb():
    """Seeds MongoDB Atlas with baseline urban infrastructure test data."""
    print("=" * 60)
    print("JanDrishti – MongoDB Atlas Seeding Utility (Developer 4)")
    print(f"Target URI: {settings.MONGODB_URI}")
    print(f"Database:   {settings.MONGODB_DB_NAME}")
    print("=" * 60)

    try:
        client = AsyncIOMotorClient(settings.MONGODB_URI, serverSelectionTimeoutMS=5000)
        db = client[settings.MONGODB_DB_NAME]
        await client.admin.command('ping')
        print("[+] Connected to MongoDB Atlas cluster.")

        # Seed Users
        print("[*] Seeding 'users' collection...")
        await db.users.delete_many({})
        if mock_store.users:
            await db.users.insert_many(mock_store.users)
        print(f"    -> Inserted {len(mock_store.users)} users.")

        # Seed Vehicles
        print("[*] Seeding 'vehicles' collection...")
        await db.vehicles.delete_many({})
        if mock_store.vehicles:
            await db.vehicles.insert_many(mock_store.vehicles)
        print(f"    -> Inserted {len(mock_store.vehicles)} vehicles.")

        # Seed Road Segments
        print("[*] Seeding 'road_segments' collection...")
        await db.road_segments.delete_many({})
        if mock_store.road_segments:
            await db.road_segments.insert_many(mock_store.road_segments)
        print(f"    -> Inserted {len(mock_store.road_segments)} road segments.")

        # Seed Observations
        print("[*] Seeding 'observations' collection...")
        await db.observations.delete_many({})
        if mock_store.observations:
            await db.observations.insert_many(mock_store.observations)
        print(f"    -> Inserted {len(mock_store.observations)} observations.")

        # Seed Risk Assessments
        print("[*] Seeding 'risk_assessments' collection...")
        await db.risk_assessments.delete_many({})
        if mock_store.risk_assessments:
            await db.risk_assessments.insert_many(mock_store.risk_assessments)
        print(f"    -> Inserted {len(mock_store.risk_assessments)} risk assessments.")

        # Seed Repair Records
        print("[*] Seeding 'repair_records' collection...")
        await db.repair_records.delete_many({})
        if mock_store.repair_records:
            await db.repair_records.insert_many(mock_store.repair_records)
        print(f"    -> Inserted {len(mock_store.repair_records)} repair records.")

        # Create 2dsphere indexes
        print("[*] Creating geospatial 2dsphere indexes...")
        await db.observations.create_index([("location", "2dsphere")])
        await db.road_segments.create_index([("geometry", "2dsphere")])
        print("[+] 2dsphere indexes created.")

        print("\n[SUCCESS] MongoDB Atlas seeding completed successfully!")
        client.close()

    except Exception as e:
        print(f"\n[ERROR] Failed to seed MongoDB Atlas: {e}")
        print("Tip: Verify your MONGODB_URI in .env or ensure your IP address is whitelisted in MongoDB Atlas Network Access.")

if __name__ == "__main__":
    asyncio.run(seed_mongodb())

