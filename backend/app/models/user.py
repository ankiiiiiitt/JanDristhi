from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    DEVELOPER = "developer"
    MUNICIPAL_OFFICER = "municipal_officer"
    FIELD_WORKER = "field_worker"
    CONTRACTOR = "contractor"
    CITIZEN = "citizen"

class UserBase(BaseModel):
    email: Optional[str] = Field(None, description="User email address")
    phone: Optional[str] = Field(None, description="Mobile phone number")
    full_name: str = Field(..., description="Full user name")
    role: UserRole = UserRole.CITIZEN
    ward_id: Optional[str] = "WARD-174"

class CitizenSignupRequest(BaseModel):
    full_name: str = Field(..., min_length=2, description="Citizen's full name")
    phone: str = Field(..., min_length=10, description="Mobile phone number")
    email: Optional[str] = Field(None, description="Optional email address")
    password: str = Field(..., min_length=6, description="Account password")

class DeveloperSignupRequest(BaseModel):
    full_name: str = Field(..., min_length=2, description="Developer full name")
    email: str = Field(..., description="Developer work email")
    password: str = Field(..., min_length=8, description="Secure account password")
    invite_code: str = Field(..., description="Developer / Admin invite authorization code")

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    # Accepts email, phone, or generic username
    email: Optional[str] = Field(None, description="Email or identifier")
    identifier: Optional[str] = Field(None, description="Email or mobile phone number")
    password: str = Field(..., description="Password")

class UserResponse(UserBase):
    user_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
