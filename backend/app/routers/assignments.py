import uuid
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.deps import get_current_user, get_db, require_roles
from app.models.assignment import Assignment
from app.models.course import Course
from app.models.user import User, UserRole
from app.schemas.assignment import AssignmentCreate, AssignmentOut, AssignmentUpdate

router = APIRouter(prefix="/assignments", tags=["assignments"])


@router.get("", response_model=List[AssignmentOut])
def list_assignments(
    _: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
    course_id: Optional[uuid.UUID] = Query(None),
) -> List[Assignment]:
    q = db.query(Assignment).options(joinedload(Assignment.created_by))
    if course_id:
        q = q.filter(Assignment.course_id == course_id)
    return q.order_by(Assignment.due_date.desc().nullslast(), Assignment.created_at.desc()).all()


@router.post("", response_model=AssignmentOut, status_code=status.HTTP_201_CREATED)
def create_assignment(
    payload: AssignmentCreate,
    current: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> Assignment:
    if current.role not in (UserRole.ADMIN, UserRole.TEACHER):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    course = db.query(Course).filter(Course.id == payload.course_id).first()
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    if current.role == UserRole.TEACHER and course.teacher_id != current.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your course")
    row = Assignment(
        course_id=payload.course_id,
        title=payload.title.strip(),
        description=payload.description,
        max_score=payload.max_score,
        weight=payload.weight,
        due_date=payload.due_date,
        created_by_user_id=current.id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return db.query(Assignment).options(joinedload(Assignment.created_by)).filter(Assignment.id == row.id).first()


@router.patch("/{assignment_id}", response_model=AssignmentOut)
def update_assignment(
    assignment_id: uuid.UUID,
    payload: AssignmentUpdate,
    current: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> Assignment:
    row = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    course = db.query(Course).filter(Course.id == row.course_id).first()
    if current.role == UserRole.TEACHER and (course is None or course.teacher_id != current.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your course")
    elif current.role not in (UserRole.ADMIN, UserRole.TEACHER):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    if payload.title is not None:
        row.title = payload.title.strip()
    if payload.description is not None:
        row.description = payload.description
    if payload.max_score is not None:
        row.max_score = payload.max_score
    if payload.weight is not None:
        row.weight = payload.weight
    if payload.due_date is not None:
        row.due_date = payload.due_date
    db.commit()
    db.refresh(row)
    return db.query(Assignment).options(joinedload(Assignment.created_by)).filter(Assignment.id == row.id).first()


@router.delete("/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assignment(
    assignment_id: uuid.UUID,
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
    db: Session = Depends(get_db),
) -> None:
    row = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    db.delete(row)
    db.commit()
