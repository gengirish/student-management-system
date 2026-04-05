import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.user import UserOut


class CourseCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str = Field(default="", max_length=8000)
    credits: int = Field(ge=1, le=30)
    teacher_id: uuid.UUID


class CourseUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=8000)
    credits: Optional[int] = Field(None, ge=1, le=30)
    teacher_id: Optional[uuid.UUID] = None


class CourseOut(BaseModel):
    id: uuid.UUID
    title: str
    description: str
    credits: int
    teacher_id: uuid.UUID
    created_at: datetime
    teacher: UserOut

    model_config = {"from_attributes": True}
