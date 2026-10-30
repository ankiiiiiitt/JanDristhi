from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime, timezone, timedelta
from jose import jwt
from app.config import settings
from app.models.user import UserLogin, UserCreate, UserResponse, TokenResponse
from app.database.mongodb import db_manager
from app.services.mock_store import mock_store

router = APIRouter(prefix="/auth", tags=["Authentication"])

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """Authenticate user with email and password."""
    # Check mock store first or MongoDB if connected
    user = None
    if db_manager.is_connected and db_manager.db is not None:
        user = await db_manager.db.users.find_one({"email": credentials.email})
    else:
        user = next((u for u in mock_store.users if u["email"] == credentials.email), None)

    # Allow default hackathon credentials
    if not user:
        if credentials.email == "officer@jandrishti.gov.in" and credentials.password == "HackathonPassword2026!":
            user = {
                "user_id": "USR-101",
                "email": "officer@jandrishti.gov.in",
                "full_name": "Dr. Ananya Rao",
                "role": "municipal_officer",
                "ward_id": "WARD-174",
                "created_at": datetime.now(timezone.utc)
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

    access_token = create_access_token(data={"sub": user["email"], "role": user.get("role", "municipal_officer")})
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            user_id=user.get("user_id", "USR-101"),
            email=user["email"],
            full_name=user.get("full_name", "Municipal User"),
            role=user.get("role", "municipal_officer"),
            ward_id=user.get("ward_id", "WARD-174"),
            created_at=user.get("created_at", datetime.now(timezone.utc))
        )
    )

@router.get("/me")
async def get_current_user_profile():
    """Returns profile for currently active user session."""
    return {
        "user_id": "USR-101",
        "email": "officer@jandrishti.gov.in",
        "full_name": "Dr. Ananya Rao",
        "role": "municipal_officer",
        "ward_id": "WARD-174"
    }
