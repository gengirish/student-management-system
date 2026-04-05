import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.user import UserOut


class GradeCreate(BaseModel):
    enrollment_id: uuid.UUID
    score: float = Field(ge=0)
    max_score: float = Field(default=100.0, ge=0.01, le=1000.0)
    letter_grade: str = Field(default="", max_length=5)
    feedback: str = Field(default="", max_length=8000)


class GradeUpdate(BaseModel):
    score: Optional[float] = Field(None, ge=0)
    max_score: Optional[float] = Field(None, ge=0.01, le=1000.0)
    letter_grade: Optional[str] = Field(None, max_length=5)
    feedback: Optional[str] = Field(None, max_length=8000)


class GradeOut(BaseModel):
    id: uuid.UUID
    enrollment_id: uuid.UUID
    score: float
    max_score: float
    letter_grade: str
    feedback: str
    graded_by_user_id: Optional[uuid.UUID]
    graded_at: datetime
    graded_by: Optional[UserOut] = None

    model_config = {"from_attributes": True}
