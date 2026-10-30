from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, timezone
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    MUNICIPAL_OFFICER = "municipal_officer"
    FIELD_WORKER = "field_worker"
    CONTRACTOR = "contractor"

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.MUNICIPAL_OFFICER
    ward_id: Optional[str] = "WARD-174"

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    user_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
