#!/usr/bin/env python3
import asyncio
import os
import sys
from pathlib import Path

# Add backend directory
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.append(str(backend_dir))

from app.database.seed_data import seed_mongodb

if __name__ == "__main__":
    asyncio.run(seed_mongodb())

