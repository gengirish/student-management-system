import uuid
from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field, computed_field

from app.schemas.user import UserOut


class StudentCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)
    student_id: str = Field(min_length=1, max_length=64)
    grade_year: int = Field(ge=1, le=20)
    enrollment_date: date


class StudentUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    student_id: Optional[str] = Field(None, min_length=1, max_length=64)
    grade_year: Optional[int] = Field(None, ge=1, le=20)
    enrollment_date: Optional[date] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=8, max_length=128)


class StudentOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    student_id: str
    grade_year: int
    enrollment_date: date
    profile_image_path: Optional[str] = None
    updated_at: datetime
    user: UserOut

    model_config = {"from_attributes": True}

    @computed_field
    @property
    def profile_image_url(self) -> Optional[str]:
        if not self.profile_image_path:
            return None
        from app.core.config import settings

        rel = self.profile_image_path.lstrip("/")
        return f"{settings.PUBLIC_BASE_URL.rstrip('/')}/static/{rel}"


class StudentListResponse(BaseModel):
    items: List[StudentOut]
    total: int
    page: int
    page_size: int
    pages: int
