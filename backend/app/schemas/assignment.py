import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.user import UserOut


class AssignmentCreate(BaseModel):
    course_id: uuid.UUID
    title: str = Field(min_length=1, max_length=255)
    description: str = Field(default="", max_length=8000)
    max_score: float = Field(default=100.0, ge=0.01, le=10000.0)
    weight: float = Field(default=1.0, ge=0.0, le=100.0)
    due_date: Optional[date] = None


class AssignmentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=8000)
    max_score: Optional[float] = Field(None, ge=0.01, le=10000.0)
    weight: Optional[float] = Field(None, ge=0.0, le=100.0)
    due_date: Optional[date] = None


class AssignmentOut(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    title: str
    description: str
    max_score: float
    weight: float
    due_date: Optional[date]
    created_by_user_id: Optional[uuid.UUID]
    created_at: datetime
    created_by: Optional[UserOut] = None

    model_config = {"from_attributes": True}
