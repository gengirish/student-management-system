import uuid
from datetime import datetime, time
from typing import Optional

from pydantic import BaseModel, Field

from app.models.schedule import DayOfWeek
from app.schemas.course import CourseOut


class ScheduleCreate(BaseModel):
    course_id: uuid.UUID
    day_of_week: DayOfWeek
    start_time: time
    end_time: time
    room: str = Field(default="", max_length=64)


class ScheduleUpdate(BaseModel):
    day_of_week: Optional[DayOfWeek] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    room: Optional[str] = Field(None, max_length=64)


class ScheduleOut(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    day_of_week: DayOfWeek
    start_time: time
    end_time: time
    room: str
    created_at: datetime
    course: CourseOut

    model_config = {"from_attributes": True}
