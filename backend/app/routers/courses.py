import uuid
from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.deps import get_current_user, get_db, require_roles
from app.models.user import User, UserRole
from app.models.course import Course
from app.schemas.course import CourseCreate, CourseOut, CourseUpdate

router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("", response_model=List[CourseOut])
def list_courses(
    _: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> List[Course]:
    return db.query(Course).options(joinedload(Course.teacher)).order_by(Course.title).all()


@router.post("", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
def create_course(
    payload: CourseCreate,
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
    db: Session = Depends(get_db),
) -> Course:
    teacher = db.query(User).filter(User.id == payload.teacher_id).first()
    if teacher is None or teacher.role != UserRole.TEACHER:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid teacher user")
    course = Course(
        title=payload.title.strip(),
        description=payload.description or "",
        credits=payload.credits,
        teacher_id=payload.teacher_id,
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return db.query(Course).options(joinedload(Course.teacher)).filter(Course.id == course.id).first()


@router.get("/{course_id}", response_model=CourseOut)
def get_course(
    course_id: uuid.UUID,
    _: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> Course:
    course = db.query(Course).options(joinedload(Course.teacher)).filter(Course.id == course_id).first()
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    return course


@router.patch("/{course_id}", response_model=CourseOut)
def update_course(
    course_id: uuid.UUID,
    payload: CourseUpdate,
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
    db: Session = Depends(get_db),
) -> Course:
    course = db.query(Course).filter(Course.id == course_id).first()
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    if payload.title is not None:
        course.title = payload.title.strip()
    if payload.description is not None:
        course.description = payload.description
    if payload.credits is not None:
        course.credits = payload.credits
    if payload.teacher_id is not None:
        teacher = db.query(User).filter(User.id == payload.teacher_id).first()
        if teacher is None or teacher.role != UserRole.TEACHER:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid teacher user")
        course.teacher_id = payload.teacher_id
    db.commit()
    db.refresh(course)
    return db.query(Course).options(joinedload(Course.teacher)).filter(Course.id == course.id).first()


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(
    course_id: uuid.UUID,
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
    db: Session = Depends(get_db),
) -> None:
    course = db.query(Course).filter(Course.id == course_id).first()
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    db.delete(course)
    db.commit()
