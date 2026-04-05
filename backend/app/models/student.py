import uuid
from datetime import date, datetime, timezone
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.enrollment import Enrollment


class Student(Base):
    __tablename__ = "students"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    student_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    grade_year: Mapped[int] = mapped_column(Integer, nullable=False)
    enrollment_date: Mapped[date] = mapped_column(Date, nullable=False)
    profile_image_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user: Mapped["User"] = relationship("User", back_populates="student_profile")
    enrollments: Mapped[List["Enrollment"]] = relationship(
        "Enrollment", back_populates="student", cascade="all, delete-orphan"
    )
