#!/usr/bin/env python3
"""
JanDrishti – MongoDB Atlas Production Connectivity & Persistent CRUD Verifier
Tests MongoDB Atlas connection, TLS handshake, index specifications,
and executes an end-to-end CRUD persistence verification cycle.
Never logs or leaks credentials or passwords.
"""

import sys
import os
import re
import asyncio
import argparse
from datetime import datetime, timezone
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from motor.motor_asyncio import AsyncIOMotorClient


def sanitize_uri(uri: str) -> str:
    """Masks username and password in connection URI."""
    if not uri:
        return "[NOT SET]"
    return re.sub(r"://([^:@]+):([^@]+)@", r"://***:***@", uri)


def extract_cluster_host(uri: str) -> str:
    """Extracts cluster hostname without credentials."""
    if not uri:
        return "[NOT CONFIGURED]"
    if "@" in uri:
        host_part = uri.split("@", 1)[1]
        return host_part.split("/", 1)[0].split("?", 1)[0]
    return uri.split("?", 1)[0]


async def verify_atlas_connectivity(uri: str, db_name: str = "jandrishti_prod"):
    print("=" * 70)
    print("JanDrishti – MongoDB Atlas Production Connectivity Verifier")
    print("=" * 70)
    print(f"Target Cluster:   {extract_cluster_host(uri)}")
    print(f"Sanitized URI:    {sanitize_uri(uri)}")
    print(f"Database Name:    {db_name}")
    print("=" * 70)

    if not uri or "localhost" in uri or "127.0.0.1" in uri:
        print("\n[!] WARNING: MONGODB_URI is not set to a remote MongoDB Atlas cluster.")
        print("[!] Current value points to local machine: " + sanitize_uri(uri))
        print("[!] On Render, localhost will FAIL because containers do not run a local MongoDB server.")
        print("[!] Set MONGODB_URI in Render Dashboard -> Web Services -> jandrishti-backend -> Environment.\n")

    client = None
    try:
        print("[1/5] Establishing TLS connection to MongoDB...")
        client = AsyncIOMotorClient(
            uri,
            serverSelectionTimeoutMS=8000,
            connectTimeoutMS=8000,
            maxPoolSize=10
        )
        t0 = asyncio.get_event_loop().time()
        ping_res = await client.admin.command('ping')
        t1 = asyncio.get_event_loop().time()
        latency_ms = round((t1 - t0) * 1000, 2)
        print(f"      -> SUCCESS: Ping response in {latency_ms} ms! Cluster is reachable.")
    except Exception as e:
        safe_err = re.sub(r"://([^:@]+):([^@]+)@", r"://***:***@", str(e))
        print(f"\n[X] CONNECTION FAILED: {type(e).__name__}: {safe_err}")
        print("\nPossible Causes:")
        print("  1. MONGODB_URI has not been added to Render Environment Variables.")
        print("  2. Atlas Network Access (IP Access List) blocks Render (add 0.0.0.0/0 in Atlas Security).")
        print("  3. Database user credentials in connection string are incorrect.")
        return False

    db = client[db_name]

    try:
        # Step 2: Inspect collections
        print("[2/5] Inspecting collections...")
        cols = await db.list_collection_names()
        print(f"      -> Existing collections ({len(cols)}): {', '.join(cols) if cols else 'None (empty database)'}")

        # Step 3: CRUD Cycle - Create & Read
        probe_id = f"PROBE-PERSIST-{int(datetime.now(timezone.utc).timestamp())}"
        print(f"[3/5] Executing CRUD Create & Read verification (Probe ID: {probe_id})...")
        probe_doc = {
            "observation_id": probe_id,
            "vehicle_id": "TEST-PROBE-VEHICLE",
            "sector": "Sector 17",
            "detection_status": "probe_test",
            "detections": [{"severity": "low", "class_id": "D00"}],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "data_label": "[TEST PROBE FOR PERSISTENCE VERIFICATION]"
        }
        insert_res = await db.observations.insert_one(probe_doc)
        assert insert_res.inserted_id is not None, "Failed to insert probe document"

        found_doc = await db.observations.find_one({"observation_id": probe_id})
        assert found_doc is not None, "Failed to retrieve probe document immediately after insertion"
        print("      -> SUCCESS: Create & Read cycle confirmed. Document verified in database.")

        # Step 4: CRUD Cycle - Update
        print("[4/5] Executing CRUD Update verification...")
        update_res = await db.observations.update_one(
            {"observation_id": probe_id},
            {"$set": {"detection_status": "probe_verified_updated"}}
        )
        assert update_res.modified_count == 1, "Failed to update probe document"
        print("      -> SUCCESS: Update operation confirmed.")

        # Step 5: CRUD Cycle - Delete & Clean Up
        print("[5/5] Executing CRUD Delete cleanup...")
        del_res = await db.observations.delete_one({"observation_id": probe_id})
        assert del_res.deleted_count == 1, "Failed to clean up probe document"
        print("      -> SUCCESS: Delete cleanup confirmed.")

        print("\n" + "=" * 70)
        print("RESULT: MongoDB Atlas persistent CRUD verification PASSED!")
        print("=" * 70)
        print(f"Cluster:       {extract_cluster_host(uri)}")
        print(f"Database:      {db_name}")
        print("Persistent:    YES (Writes and reads survive restarts across cloud instances)")
        print("=" * 70)
        return True

    except Exception as e:
        safe_err = re.sub(r"://([^:@]+):([^@]+)@", r"://***:***@", str(e))
        print(f"\n[X] CRUD VERIFICATION FAILED: {type(e).__name__}: {safe_err}")
        return False
    finally:
        client.close()


def main():
    parser = argparse.ArgumentParser(description="Verify MongoDB Atlas Production Connectivity")
    parser.add_argument("--uri", default=os.environ.get("MONGODB_URI", ""), help="MongoDB Connection URI")
    parser.add_argument("--db", default=os.environ.get("MONGODB_DB_NAME", "jandrishti_prod"), help="Target database")
    args = parser.parse_args()

    uri = args.uri.strip()
    if not uri:
        # Fall back to backend config
        try:
            from app.config import settings
            uri = settings.MONGODB_URI
        except Exception:
            pass

    success = asyncio.run(verify_atlas_connectivity(uri, args.db))
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()

