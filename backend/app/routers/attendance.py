import uuid
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.deps import get_current_user, get_db
from app.models.attendance import Attendance
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.student import Student
from app.models.user import User, UserRole
from app.schemas.attendance import (
    AttendanceBulkCreate,
    AttendanceCreate,
    AttendanceOut,
    AttendanceUpdate,
)

router = APIRouter(prefix="/attendance", tags=["attendance"])


def _can_mark(current: User, enrollment: Enrollment, db: Session) -> None:
    if current.role == UserRole.ADMIN:
        return
    if current.role == UserRole.TEACHER:
        course = db.query(Course).filter(Course.id == enrollment.course_id).first()
        if course and course.teacher_id == current.id:
            return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")


@router.post("", response_model=AttendanceOut, status_code=status.HTTP_201_CREATED)
def create_attendance(
    payload: AttendanceCreate,
    current: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> Attendance:
    enrollment = db.query(Enrollment).filter(Enrollment.id == payload.enrollment_id).first()
    if enrollment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enrollment not found")
    _can_mark(current, enrollment, db)
    existing = (
        db.query(Attendance)
        .filter(Attendance.enrollment_id == payload.enrollment_id, Attendance.date == payload.date)
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Attendance already recorded for this date")
    row = Attendance(
        enrollment_id=payload.enrollment_id,
        date=payload.date,
        status=payload.status,
        notes=payload.notes,
        marked_by_user_id=current.id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.post("/bulk", response_model=List[AttendanceOut], status_code=status.HTTP_201_CREATED)
def bulk_create_attendance(
    payload: AttendanceBulkCreate,
    current: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> List[Attendance]:
    if current.role not in (UserRole.ADMIN, UserRole.TEACHER):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    results: list[Attendance] = []
    for item in payload.records:
        enrollment = db.query(Enrollment).filter(Enrollment.id == item.enrollment_id).first()
        if enrollment is None:
            continue
        existing = (
            db.query(Attendance)
            .filter(Attendance.enrollment_id == item.enrollment_id, Attendance.date == payload.date)
            .first()
        )
        if existing:
            existing.status = item.status
            existing.notes = item.notes
            existing.marked_by_user_id = current.id
            results.append(existing)
        else:
            row = Attendance(
                enrollment_id=item.enrollment_id,
                date=payload.date,
                status=item.status,
                notes=item.notes,
                marked_by_user_id=current.id,
            )
            db.add(row)
            results.append(row)
    db.commit()
    for r in results:
        db.refresh(r)
    return results


@router.get("", response_model=List[AttendanceOut])
def list_attendance(
    current: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
    course_id: Optional[uuid.UUID] = Query(None),
    student_id: Optional[uuid.UUID] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
) -> List[Attendance]:
    q = db.query(Attendance)
    if current.role == UserRole.STUDENT:
        profile = db.query(Student).filter(Student.user_id == current.id).first()
        if profile is None:
            return []
        q = q.join(Enrollment).filter(Enrollment.student_id == profile.id)
    elif current.role == UserRole.TEACHER:
        q = q.join(Enrollment).join(Course).filter(Course.teacher_id == current.id)
    else:
        if student_id:
            q = q.join(Enrollment).filter(Enrollment.student_id == student_id)
        if course_id:
            if student_id:
                q = q.filter(Enrollment.course_id == course_id)
            else:
                q = q.join(Enrollment).filter(Enrollment.course_id == course_id)
    if date_from:
        q = q.filter(Attendance.date >= date_from)
    if date_to:
        q = q.filter(Attendance.date <= date_to)
    return q.order_by(Attendance.date.desc()).limit(500).all()


@router.patch("/{attendance_id}", response_model=AttendanceOut)
def update_attendance(
    attendance_id: uuid.UUID,
    payload: AttendanceUpdate,
    current: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> Attendance:
    row = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    enrollment = db.query(Enrollment).filter(Enrollment.id == row.enrollment_id).first()
    _can_mark(current, enrollment, db)
    if payload.status is not None:
        row.status = payload.status
    if payload.notes is not None:
        row.notes = payload.notes
    row.marked_by_user_id = current.id
    db.commit()
    db.refresh(row)
    return row
