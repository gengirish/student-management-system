import uuid
from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.models.attendance import AttendanceStatus


class AttendanceCreate(BaseModel):
    enrollment_id: uuid.UUID
    date: date
    status: AttendanceStatus
    notes: str = Field(default="", max_length=2000)


class AttendanceBulkItem(BaseModel):
    enrollment_id: uuid.UUID
    status: AttendanceStatus
    notes: str = Field(default="", max_length=2000)


class AttendanceBulkCreate(BaseModel):
    date: date
    records: List[AttendanceBulkItem] = Field(min_length=1)


class AttendanceUpdate(BaseModel):
    status: Optional[AttendanceStatus] = None
    notes: Optional[str] = Field(None, max_length=2000)


class AttendanceOut(BaseModel):
    id: uuid.UUID
    enrollment_id: uuid.UUID
    date: date
    status: AttendanceStatus
    notes: str
    marked_by_user_id: Optional[uuid.UUID]
    created_at: datetime

    model_config = {"from_attributes": True}
