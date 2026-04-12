"""
Settings router — GET/PUT /api/notifications/settings
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from models.notification import NotificationPreference
from utils.auth import get_current_user
from schemas.settings import NotificationSettingsResponse, NotificationSettingsUpdate
from cache import cache_get, cache_set, cache_invalidate

router = APIRouter(prefix="/api/notifications", tags=["settings"])


@router.get("/settings", response_model=NotificationSettingsResponse)
def get_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get notification preferences for the current user."""
    cached = cache_get(current_user.id, "notification_settings")
    if cached is not None:
        return cached

    prefs = (
        db.query(NotificationPreference)
        .filter(NotificationPreference.user_id == current_user.id)
        .first()
    )

    if not prefs:
        # Create defaults if missing
        prefs = NotificationPreference(user_id=current_user.id)
        db.add(prefs)
        db.commit()
        db.refresh(prefs)

    result = NotificationSettingsResponse.model_validate(prefs)

    cache_set(current_user.id, "notification_settings", result)
    return result


@router.put("/settings", response_model=NotificationSettingsResponse)
def update_settings(
    request: NotificationSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update notification preferences (partial update)."""
    prefs = (
        db.query(NotificationPreference)
        .filter(NotificationPreference.user_id == current_user.id)
        .first()
    )

    if not prefs:
        prefs = NotificationPreference(user_id=current_user.id)
        db.add(prefs)
        db.commit()
        db.refresh(prefs)

    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(prefs, field, value)

    db.commit()
    db.refresh(prefs)

    # Invalidate cache
    cache_invalidate(current_user.id, "notification_settings")

    return NotificationSettingsResponse.model_validate(prefs)
