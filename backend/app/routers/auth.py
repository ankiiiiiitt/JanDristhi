import uuid
import logging
from fastapi import APIRouter, HTTPException, status, Depends, Header
from datetime import datetime, timezone, timedelta
from typing import Optional
from jose import jwt, JWTError
from app.config import settings
from app.models.user import (
    UserRole,
    UserLogin,
    UserCreate,
    CitizenSignupRequest,
    DeveloperSignupRequest,
    UserResponse,
    TokenResponse
)
from app.database.mongodb import db_manager
from app.services.mock_store import mock_store
from app.services.security import hash_password, verify_password

logger = logging.getLogger("jandrishti.auth")
router = APIRouter(prefix="/auth", tags=["Authentication"])

# Authorization code required for Developer/Admin registration
DEVELOPER_REGISTRATION_SECRET = "DEV-JANDRISHTI-2026-KEY"


def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")


async def get_current_user_from_token(authorization: Optional[str] = Header(None)) -> dict:
    """Decodes JWT Bearer token and returns authenticated user."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Bearer authentication token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        sub = payload.get("sub")
        if not sub:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
        return payload
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired or corrupted")


@router.post("/signup/citizen", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup_citizen(payload: CitizenSignupRequest):
    """
    Public registration endpoint for citizens and field drivers.
    Registers user with bcrypt password hashing and returns JWT access token.
    """
    # 1. Check for existing user by phone or email
    clean_phone = payload.phone.strip()
    clean_email = payload.email.strip() if payload.email else f"{clean_phone}@citizen.jandrishti.in"

    if db_manager.is_connected and db_manager.db is not None:
        existing = await db_manager.db.users.find_one({
            "$or": [{"phone": clean_phone}, {"email": clean_email}]
        })
    else:
        existing = next(
            (u for u in mock_store.users if u.get("phone") == clean_phone or (clean_email and u.get("email") == clean_email)),
            None
        )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this mobile number or email already exists."
        )

    user_id = f"USR-CTZ-{uuid.uuid4().hex[:6].upper()}"
    hashed_pwd = hash_password(payload.password)
    now = datetime.now(timezone.utc)

    user_doc = {
        "user_id": user_id,
        "full_name": payload.full_name.strip(),
        "phone": clean_phone,
        "email": clean_email,
        "hashed_password": hashed_pwd,
        "role": UserRole.CITIZEN.value,
        "ward_id": "WARD-174",
        "created_at": now
    }

    # Persist
    if db_manager.is_connected and db_manager.db is not None:
        await db_manager.db.users.insert_one(user_doc)
    else:
        mock_store.users.append(user_doc)

    access_token = create_access_token(data={
        "sub": clean_email or clean_phone,
        "user_id": user_id,
        "role": UserRole.CITIZEN.value
    })

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            user_id=user_id,
            full_name=user_doc["full_name"],
            phone=user_doc["phone"],
            email=user_doc["email"],
            role=UserRole.CITIZEN,
            ward_id=user_doc["ward_id"],
            created_at=now
        )
    )


@router.post("/signup/developer", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup_developer(payload: DeveloperSignupRequest):
    """
    Protected registration endpoint for engineers and municipal admins.
    Requires valid Developer/Admin authorization invite code.
    """
    if payload.invite_code != DEVELOPER_REGISTRATION_SECRET and payload.invite_code != "HACKATHON-2026":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid developer authorization code. Developer onboarding is protected."
        )

    clean_email = payload.email.strip().lower()

    if db_manager.is_connected and db_manager.db is not None:
        existing = await db_manager.db.users.find_one({"email": clean_email})
    else:
        existing = next((u for u in mock_store.users if u.get("email") == clean_email), None)

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A developer account with this email already exists."
        )

    user_id = f"USR-DEV-{uuid.uuid4().hex[:6].upper()}"
    hashed_pwd = hash_password(payload.password)
    now = datetime.now(timezone.utc)

    user_doc = {
        "user_id": user_id,
        "full_name": payload.full_name.strip(),
        "email": clean_email,
        "hashed_password": hashed_pwd,
        "role": UserRole.DEVELOPER.value,
        "ward_id": "WARD-HQ",
        "created_at": now
    }

    if db_manager.is_connected and db_manager.db is not None:
        await db_manager.db.users.insert_one(user_doc)
    else:
        mock_store.users.append(user_doc)

    access_token = create_access_token(data={
        "sub": clean_email,
        "user_id": user_id,
        "role": UserRole.DEVELOPER.value
    })

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            user_id=user_id,
            full_name=user_doc["full_name"],
            email=user_doc["email"],
            role=UserRole.DEVELOPER,
            ward_id=user_doc["ward_id"],
            created_at=now
        )
    )


# Alias for generic signup
@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup_generic(payload: CitizenSignupRequest):
    return await signup_citizen(payload)


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """
    Authenticates user via Email OR Mobile Phone Number with bcrypt verification.
    Preserves default hackathon demo credentials.
    """
    identifier = (credentials.identifier or credentials.email or "").strip()
    if not identifier:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email or phone number is required.")

    # 1. Search in DB or mock store
    user = None
    if db_manager.is_connected and db_manager.db is not None:
        user = await db_manager.db.users.find_one({
            "$or": [{"email": identifier}, {"phone": identifier}]
        })
    else:
        user = next(
            (u for u in mock_store.users if u.get("email") == identifier or u.get("phone") == identifier),
            None
        )

    # 2. Check default hackathon demo fallback credentials (preserves existing integration)
    if not user:
        if (identifier == "officer@jandrishti.gov.in" or identifier == "officer"):
            user = {
                "user_id": "USR-101",
                "email": "officer@jandrishti.gov.in",
                "phone": "+91 98765 00000",
                "full_name": "Dr. Ananya Rao",
                "role": UserRole.MUNICIPAL_OFFICER.value,
                "ward_id": "WARD-174",
                "created_at": datetime.now(timezone.utc)
            }
        elif identifier == "rohit@jandrishti.in":
            user = {
                "user_id": "USR-CTZ-001",
                "email": "rohit@jandrishti.in",
                "phone": "+91 98765 43210",
                "full_name": "Rohit Kumar",
                "role": UserRole.CITIZEN.value,
                "ward_id": "WARD-174",
                "created_at": datetime.now(timezone.utc)
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email/mobile or password"
            )

    # 3. Verify password
    # Check default demo credentials
    if identifier in ["officer@jandrishti.gov.in", "officer"] and credentials.password == "HackathonPassword2026!":
        pass  # Valid legacy demo credentials
    elif identifier == "rohit@jandrishti.in" and credentials.password == "password123":
        pass  # Valid citizen demo credentials
    else:
        stored_hash = user.get("hashed_password")
        if stored_hash:
            if not verify_password(credentials.password, stored_hash):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email/mobile or password"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email/mobile or password"
            )

    access_token = create_access_token(data={
        "sub": user.get("email") or user.get("phone"),
        "user_id": user.get("user_id"),
        "role": user.get("role", UserRole.CITIZEN.value)
    })

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            user_id=user.get("user_id", "USR-101"),
            email=user.get("email"),
            phone=user.get("phone"),
            full_name=user.get("full_name", "JanDrishti User"),
            role=user.get("role", UserRole.CITIZEN),
            ward_id=user.get("ward_id", "WARD-174"),
            created_at=user.get("created_at", datetime.now(timezone.utc))
        )
    )


@router.get("/me")
async def get_current_user_profile(user_claims: dict = Depends(get_current_user_from_token)):
    """Returns profile for currently active authenticated user session."""
    user_id = user_claims.get("user_id")
    email = user_claims.get("sub")
    role = user_claims.get("role", UserRole.MUNICIPAL_OFFICER.value)

    user = None
    if db_manager.is_connected and db_manager.db is not None:
        user = await db_manager.db.users.find_one(
            {"$or": [{"user_id": user_id}, {"email": email}]},
            {"_id": 0, "hashed_password": 0}
        )
    else:
        user = next(
            (u for u in mock_store.users if (user_id and u.get("user_id") == user_id) or (email and u.get("email") == email)),
            None
        )

    if user:
        return {
            "user_id": user.get("user_id", user_id or "USR-101"),
            "email": user.get("email", email or "officer@jandrishti.gov.in"),
            "phone": user.get("phone"),
            "full_name": user.get("full_name", "Authenticated User"),
            "role": user.get("role", role),
            "ward_id": user.get("ward_id", "WARD-174")
        }

    return {
        "user_id": user_id or "USR-101",
        "email": email or "officer@jandrishti.gov.in",
        "full_name": "Authenticated User",
        "role": role,
        "ward_id": "WARD-174"
    }
