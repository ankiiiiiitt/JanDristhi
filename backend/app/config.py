import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "info"
    SECRET_KEY: str = "hackathon-super-secret-key-change-in-production-2025"
    API_PREFIX: str = "/api/v1"

    # Server settings
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
    ]
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    MOCK_MODE: bool = False

    # MongoDB Atlas
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "jandrishti_dev"
    MONGODB_MAX_POOL_SIZE: int = 50
    MONGODB_MIN_POOL_SIZE: int = 10

    # AI Engine
    AI_ENGINE_HOST: str = "127.0.0.1"
    AI_ENGINE_PORT: int = 8001
    AI_CONFIDENCE_THRESHOLD: float = 0.35

    # Storage
    UPLOAD_STORAGE_DIR: str = "backend/uploads"

    class Config:
        env_file = (".env", "../.env")
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
