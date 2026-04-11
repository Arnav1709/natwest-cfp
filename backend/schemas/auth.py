"""
Authentication schemas — register, login, token, user response.
"""

from pydantic import BaseModel, Field
from typing import Optional


class RegisterRequest(BaseModel):
    """Registration request body."""
    shop_name: str = Field(..., min_length=1, max_length=200)
    business_type: str = Field(..., pattern="^(pharmacy|grocery|retail|other)$")
    city: Optional[str] = None
    state: Optional[str] = None
    language: str = Field(default="en", max_length=5)
    phone: str = Field(..., min_length=10, max_length=15)
    email: Optional[str] = None
    password: str = Field(..., min_length=6, max_length=100)


class LoginRequest(BaseModel):
    """Login request body."""
    phone: str = Field(..., min_length=10, max_length=15)
    password: str = Field(..., min_length=6, max_length=100)


class UserResponse(BaseModel):
    """User information returned in responses."""
    id: int
    shop_name: str
    business_type: str
    city: Optional[str] = None
    state: Optional[str] = None
    language: str
    phone: Optional[str] = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """Authentication token response."""
    user: UserResponse
    access_token: str
    token_type: str = "bearer"
