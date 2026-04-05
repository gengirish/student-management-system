import uuid
from datetime import datetime

from pydantic import BaseModel

from app.schemas.course import CourseOut
from app.schemas.student import StudentOut


class EnrollmentCreate(BaseModel):
    student_id: uuid.UUID
    course_id: uuid.UUID


class EnrollmentOut(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    course_id: uuid.UUID
    enrolled_at: datetime
    student: StudentOut
    course: CourseOut

    model_config = {"from_attributes": True}
