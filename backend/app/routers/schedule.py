import uuid
from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.deps import get_current_user, get_db, require_roles
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.schedule import Schedule
from app.models.student import Student
from app.models.user import User, UserRole
from app.schemas.schedule import ScheduleCreate, ScheduleOut, ScheduleUpdate

router = APIRouter(prefix="/schedule", tags=["schedule"])


@router.get("", response_model=List[ScheduleOut])
def list_schedule(
    current: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> List[Schedule]:
    q = db.query(Schedule).options(joinedload(Schedule.course).joinedload(Course.teacher))
    if current.role == UserRole.STUDENT:
        profile = db.query(Student).filter(Student.user_id == current.id).first()
        if profile is None:
            return []
        enrolled = db.query(Enrollment.course_id).filter(Enrollment.student_id == profile.id).subquery()
        q = q.filter(Schedule.course_id.in_(enrolled))
    elif current.role == UserRole.TEACHER:
        q = q.filter(Schedule.course_id.in_(
            db.query(Course.id).filter(Course.teacher_id == current.id).subquery()
        ))
    return q.order_by(Schedule.day_of_week, Schedule.start_time).all()


@router.post("", response_model=ScheduleOut, status_code=status.HTTP_201_CREATED)
def create_schedule(
    payload: ScheduleCreate,
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
    db: Session = Depends(get_db),
) -> Schedule:
    course = db.query(Course).filter(Course.id == payload.course_id).first()
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    if payload.start_time >= payload.end_time:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="start_time must be before end_time")
    row = Schedule(
        course_id=payload.course_id,
        day_of_week=payload.day_of_week,
        start_time=payload.start_time,
        end_time=payload.end_time,
        room=payload.room,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return (
        db.query(Schedule)
        .options(joinedload(Schedule.course).joinedload(Course.teacher))
        .filter(Schedule.id == row.id)
        .first()
    )


@router.patch("/{schedule_id}", response_model=ScheduleOut)
def update_schedule(
    schedule_id: uuid.UUID,
    payload: ScheduleUpdate,
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
    db: Session = Depends(get_db),
) -> Schedule:
    row = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    if payload.day_of_week is not None:
        row.day_of_week = payload.day_of_week
    if payload.start_time is not None:
        row.start_time = payload.start_time
    if payload.end_time is not None:
        row.end_time = payload.end_time
    if payload.room is not None:
        row.room = payload.room
    db.commit()
    db.refresh(row)
    return (
        db.query(Schedule)
        .options(joinedload(Schedule.course).joinedload(Course.teacher))
        .filter(Schedule.id == row.id)
        .first()
    )


@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_schedule(
    schedule_id: uuid.UUID,
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
    db: Session = Depends(get_db),
) -> None:
    row = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    db.delete(row)
    db.commit()
