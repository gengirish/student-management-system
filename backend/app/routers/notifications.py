import uuid
from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationOut, UnreadCount

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=List[NotificationOut])
def list_notifications(
    current: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> List[Notification]:
    return (
        db.query(Notification)
        .filter(Notification.user_id == current.id)
        .order_by(Notification.is_read, Notification.created_at.desc())
        .limit(50)
        .all()
    )


@router.get("/unread-count", response_model=UnreadCount)
def unread_count(
    current: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> UnreadCount:
    count = (
        db.query(Notification)
        .filter(Notification.user_id == current.id, Notification.is_read.is_(False))
        .count()
    )
    return UnreadCount(count=count)


@router.patch("/{notification_id}/read", response_model=NotificationOut)
def mark_read(
    notification_id: uuid.UUID,
    current: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> Notification:
    row = db.query(Notification).filter(
        Notification.id == notification_id, Notification.user_id == current.id
    ).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    row.is_read = True
    db.commit()
    db.refresh(row)
    return row


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
def mark_all_read(
    current: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> None:
    db.query(Notification).filter(
        Notification.user_id == current.id, Notification.is_read.is_(False)
    ).update({"is_read": True})
    db.commit()
