import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.announcement import AnnouncementScope
from app.schemas.user import UserOut


class AnnouncementCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    body: str = Field(min_length=1, max_length=10000)
    scope: AnnouncementScope = AnnouncementScope.GLOBAL
    course_id: Optional[uuid.UUID] = None


class AnnouncementOut(BaseModel):
    id: uuid.UUID
    title: str
    body: str
    author_id: uuid.UUID
    scope: AnnouncementScope
    course_id: Optional[uuid.UUID]
    created_at: datetime
    author: UserOut

    model_config = {"from_attributes": True}
