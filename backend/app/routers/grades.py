import uuid
from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.deps import get_current_user, get_db, require_roles
from app.models.user import User, UserRole
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.grade import Grade
from app.models.student import Student
from app.schemas.grade import GradeCreate, GradeOut, GradeUpdate

router = APIRouter(prefix="/grades", tags=["grades"])


def _grade_out_query(db: Session):
    return db.query(Grade).options(joinedload(Grade.graded_by), joinedload(Grade.enrollment))


def _assert_teacher_or_admin_for_enrollment(current: User, db: Session, enrollment: Enrollment) -> None:
    if current.role == UserRole.ADMIN:
        return
    if current.role != UserRole.TEACHER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only teachers and admins can manage grades")
    course = db.query(Course).filter(Course.id == enrollment.course_id).first()
    if course is None or course.teacher_id != current.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not teach this course")


@router.post("", response_model=GradeOut, status_code=status.HTTP_201_CREATED)
def create_grade(
    payload: GradeCreate,
    current: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> Grade:
    if current.role not in (UserRole.TEACHER, UserRole.ADMIN):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only teachers and admins can assign grades")

    enrollment = (
        db.query(Enrollment)
        .options(joinedload(Enrollment.course))
        .filter(Enrollment.id == payload.enrollment_id)
        .first()
    )
    if enrollment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enrollment not found")

    _assert_teacher_or_admin_for_enrollment(current, db, enrollment)

    if payload.score > payload.max_score:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Score cannot exceed max_score")

    existing = db.query(Grade).filter(Grade.enrollment_id == enrollment.id).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Grade already exists for this enrollment")

    grade = Grade(
        enrollment_id=enrollment.id,
        score=payload.score,
        max_score=payload.max_score,
        letter_grade=payload.letter_grade or "",
        feedback=payload.feedback or "",
        graded_by_user_id=current.id,
    )
    db.add(grade)
    db.commit()
    db.refresh(grade)
    return _grade_out_query(db).filter(Grade.id == grade.id).first()


@router.get("", response_model=List[GradeOut])
def list_grades(
    current: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
    enrollment_id: uuid.UUID | None = None,
) -> List[Grade]:
    q = _grade_out_query(db)

    if enrollment_id:
        q = q.filter(Grade.enrollment_id == enrollment_id)

    if current.role == UserRole.ADMIN:
        return q.order_by(Grade.graded_at.desc()).all()

    if current.role == UserRole.TEACHER:
        q = q.join(Enrollment).join(Course).filter(Course.teacher_id == current.id)
        return q.order_by(Grade.graded_at.desc()).all()

    profile = db.query(Student).filter(Student.user_id == current.id).first()
    if profile is None:
        return []
    q = q.join(Enrollment).filter(Enrollment.student_id == profile.id)
    return q.order_by(Grade.graded_at.desc()).all()


@router.get("/{grade_id}", response_model=GradeOut)
def get_grade(
    grade_id: uuid.UUID,
    current: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> Grade:
    grade = _grade_out_query(db).filter(Grade.id == grade_id).first()
    if grade is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grade not found")

    enrollment = grade.enrollment
    if current.role == UserRole.ADMIN:
        return grade
    if current.role == UserRole.TEACHER:
        course = db.query(Course).filter(Course.id == enrollment.course_id).first()
        if course and course.teacher_id == current.id:
            return grade
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    profile = db.query(Student).filter(Student.user_id == current.id).first()
    if profile and enrollment.student_id == profile.id:
        return grade
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")


@router.patch("/{grade_id}", response_model=GradeOut)
def update_grade(
    grade_id: uuid.UUID,
    payload: GradeUpdate,
    current: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> Grade:
    grade = db.query(Grade).filter(Grade.id == grade_id).first()
    if grade is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grade not found")
    enrollment = (
        db.query(Enrollment).options(joinedload(Enrollment.course)).filter(Enrollment.id == grade.enrollment_id).first()
    )
    _assert_teacher_or_admin_for_enrollment(current, db, enrollment)

    max_s = payload.max_score if payload.max_score is not None else grade.max_score
    score = payload.score if payload.score is not None else grade.score
    if score > max_s:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Score cannot exceed max_score")

    if payload.score is not None:
        grade.score = payload.score
    if payload.max_score is not None:
        grade.max_score = payload.max_score
    if payload.letter_grade is not None:
        grade.letter_grade = payload.letter_grade
    if payload.feedback is not None:
        grade.feedback = payload.feedback
    grade.graded_by_user_id = current.id

    db.commit()
    db.refresh(grade)
    return _grade_out_query(db).filter(Grade.id == grade.id).first()


@router.delete("/{grade_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_grade(
    grade_id: uuid.UUID,
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
    db: Session = Depends(get_db),
) -> None:
    grade = db.query(Grade).filter(Grade.id == grade_id).first()
    if grade is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grade not found")
    db.delete(grade)
    db.commit()
