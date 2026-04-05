import uuid
from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.deps import get_current_user, get_db, require_roles
from app.models.user import User, UserRole
from app.models.course import Course
from app.models.student import Student
from app.models.enrollment import Enrollment
from app.schemas.enrollment import EnrollmentCreate, EnrollmentOut

router = APIRouter(prefix="/enrollments", tags=["enrollments"])


def _enrollment_options(q):
    return q.options(
        joinedload(Enrollment.student).joinedload(Student.user),
        joinedload(Enrollment.course).joinedload(Course.teacher),
    )


@router.post("", response_model=EnrollmentOut, status_code=status.HTTP_201_CREATED)
def create_enrollment(
    payload: EnrollmentCreate,
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
    db: Session = Depends(get_db),
) -> Enrollment:
    student = db.query(Student).filter(Student.id == payload.student_id).first()
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    course = db.query(Course).filter(Course.id == payload.course_id).first()
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    exists = (
        db.query(Enrollment)
        .filter(Enrollment.student_id == payload.student_id, Enrollment.course_id == payload.course_id)
        .first()
    )
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Student already enrolled")

    row = Enrollment(student_id=payload.student_id, course_id=payload.course_id)
    db.add(row)
    db.commit()
    db.refresh(row)
    return (
        _enrollment_options(db.query(Enrollment))
        .filter(Enrollment.id == row.id)
        .first()
    )


@router.get("", response_model=List[EnrollmentOut])
def list_enrollments(
    current: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
    course_id: uuid.UUID | None = None,
    student_id: uuid.UUID | None = None,
) -> List[Enrollment]:
    q = _enrollment_options(db.query(Enrollment))

    if current.role == UserRole.ADMIN:
        if course_id:
            q = q.filter(Enrollment.course_id == course_id)
        if student_id:
            q = q.filter(Enrollment.student_id == student_id)
        return q.order_by(Enrollment.enrolled_at.desc()).all()

    if current.role == UserRole.TEACHER:
        q = q.join(Course).filter(Course.teacher_id == current.id)
        if course_id:
            q = q.filter(Enrollment.course_id == course_id)
        return q.order_by(Enrollment.enrolled_at.desc()).all()

    profile = db.query(Student).filter(Student.user_id == current.id).first()
    if profile is None:
        return []
    q = q.filter(Enrollment.student_id == profile.id)
    if course_id:
        q = q.filter(Enrollment.course_id == course_id)
    return q.order_by(Enrollment.enrolled_at.desc()).all()
