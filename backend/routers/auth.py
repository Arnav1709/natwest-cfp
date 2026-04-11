"""
Auth router — POST /api/auth/register, POST /api/auth/login
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from models.notification import NotificationPreference
from schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse
from utils.auth import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """
    Register a new user account.

    Creates user, sets default notification preferences,
    and returns JWT token + user profile.
    """
    # Check if phone already exists
    existing = db.query(User).filter(User.phone == request.phone).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this phone number already exists",
        )

    # Create user
    user = User(
        shop_name=request.shop_name,
        business_type=request.business_type,
        city=request.city,
        state=request.state,
        language=request.language,
        phone=request.phone,
        email=request.email,
        password_hash=hash_password(request.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Create default notification preferences
    prefs = NotificationPreference(user_id=user.id)
    db.add(prefs)
    db.commit()

    # Generate JWT
    token = create_access_token(data={"sub": str(user.id)})

    return TokenResponse(
        user=UserResponse.model_validate(user),
        access_token=token,
        token_type="bearer",
    )


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate user with phone + password.
    Returns JWT token + user profile.
    """
    user = db.query(User).filter(User.phone == request.phone).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid phone number or password",
        )

    token = create_access_token(data={"sub": str(user.id)})

    return TokenResponse(
        user=UserResponse.model_validate(user),
        access_token=token,
        token_type="bearer",
    )
