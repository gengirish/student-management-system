import io
import math
import uuid
from pathlib import Path
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.security import hash_password
from app.deps import get_current_user, get_db, require_roles
from app.models.user import User, UserRole
from app.models.student import Student
from app.schemas.student import StudentCreate, StudentListResponse, StudentOut, StudentUpdate

router = APIRouter(prefix="/students", tags=["students"])

ALLOWED_IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp"}


def _ensure_upload_dir() -> Path:
    base = Path(settings.UPLOAD_DIR) / "profiles"
    base.mkdir(parents=True, exist_ok=True)
    return base


def _load_student(db: Session, student_id: uuid.UUID) -> Optional[Student]:
    return (
        db.query(Student)
        .options(joinedload(Student.user))
        .filter(Student.id == student_id)
        .first()
    )


def _assert_student_access(current: User, student: Student) -> None:
    if current.role == UserRole.ADMIN:
        return
    if current.role == UserRole.TEACHER:
        return
    if current.role == UserRole.STUDENT and student.user_id == current.id:
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to access this student")


@router.get("", response_model=StudentListResponse)
def list_students(
    current: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
    page: int = 1,
    page_size: int = 20,
    q: Optional[str] = None,
) -> StudentListResponse:
    if current.role == UserRole.STUDENT:
        profile = db.query(Student).options(joinedload(Student.user)).filter(Student.user_id == current.id).first()
        if profile is None:
            return StudentListResponse(items=[], total=0, page=1, page_size=page_size, pages=0)
        return StudentListResponse(
            items=[StudentOut.model_validate(profile)],
            total=1,
            page=1,
            page_size=page_size,
            pages=1,
        )

    if page < 1:
        page = 1
    if page_size < 1 or page_size > 100:
        page_size = 20

    query = db.query(Student).options(joinedload(Student.user))
    if q and q.strip():
        term = f"%{q.strip().lower()}%"
        query = query.join(User).filter(
            or_(
                func.lower(User.full_name).like(term),
                func.lower(User.email).like(term),
                func.lower(Student.student_id).like(term),
            )
        )
    total = query.count()
    pages = math.ceil(total / page_size) if total else 0
    rows = (
        query.order_by(Student.enrollment_date.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return StudentListResponse(
        items=[StudentOut.model_validate(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.post("", response_model=StudentOut, status_code=status.HTTP_201_CREATED)
def create_student(
    payload: StudentCreate,
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
    db: Session = Depends(get_db),
) -> Student:
    email = payload.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")
    if db.query(Student).filter(Student.student_id == payload.student_id.strip()).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Student ID already exists")

    user = User(
        email=email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name.strip(),
        role=UserRole.STUDENT,
    )
    db.add(user)
    db.flush()
    student = Student(
        user_id=user.id,
        student_id=payload.student_id.strip(),
        grade_year=payload.grade_year,
        enrollment_date=payload.enrollment_date,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    student = _load_student(db, student.id)
    return student


@router.get("/{student_id}", response_model=StudentOut)
def get_student(
    student_id: uuid.UUID,
    current: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> Student:
    student = _load_student(db, student_id)
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    _assert_student_access(current, student)
    return student


@router.patch("/{student_id}", response_model=StudentOut)
def update_student(
    student_id: uuid.UUID,
    payload: StudentUpdate,
    current: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> Student:
    student = _load_student(db, student_id)
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    if current.role == UserRole.STUDENT:
        if student.user_id != current.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
        if payload.student_id is not None or payload.enrollment_date is not None or payload.email is not None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot change those fields")
    elif current.role == UserRole.TEACHER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Teachers cannot edit student records")
    elif current.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    user = student.user
    if payload.full_name is not None:
        user.full_name = payload.full_name.strip()
    if payload.email is not None and current.role == UserRole.ADMIN:
        new_email = payload.email.lower()
        existing = db.query(User).filter(User.email == new_email, User.id != user.id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")
        user.email = new_email
    if payload.password is not None:
        user.hashed_password = hash_password(payload.password)
    if payload.student_id is not None and current.role == UserRole.ADMIN:
        sid = payload.student_id.strip()
        taken = db.query(Student).filter(Student.student_id == sid, Student.id != student.id).first()
        if taken:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Student ID already exists")
        student.student_id = sid
    if payload.grade_year is not None:
        student.grade_year = payload.grade_year
    if payload.enrollment_date is not None and current.role == UserRole.ADMIN:
        student.enrollment_date = payload.enrollment_date

    db.commit()
    db.refresh(student)
    return _load_student(db, student.id)


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(
    student_id: uuid.UUID,
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
    db: Session = Depends(get_db),
) -> None:
    student = _load_student(db, student_id)
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    db.delete(student.user)
    db.commit()


@router.get("/export/csv")
def export_students_csv(
    _: Annotated[User, Depends(require_roles(UserRole.ADMIN))],
    db: Session = Depends(get_db),
) -> StreamingResponse:
    rows = db.query(Student).options(joinedload(Student.user)).order_by(Student.enrollment_date.desc()).all()
    lines = ["Full Name,Email,Student ID,Grade Year,Enrollment Date"]
    for s in rows:
        lines.append(f'"{s.user.full_name}",{s.user.email},{s.student_id},{s.grade_year},{s.enrollment_date}')
    buf = io.BytesIO("\n".join(lines).encode("utf-8"))
    return StreamingResponse(
        buf, media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="students.csv"'},
    )


@router.post("/{student_id}/profile-image", response_model=StudentOut)
async def upload_profile_image(
    student_id: uuid.UUID,
    current: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
    file: UploadFile = File(...),
) -> Student:
    student = _load_student(db, student_id)
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    if current.role != UserRole.ADMIN and student.user_id != current.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_IMAGE_EXT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(sorted(ALLOWED_IMAGE_EXT))}",
        )

    upload_base = _ensure_upload_dir()
    fname = f"{uuid.uuid4().hex}{ext}"
    dest = upload_base / fname
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large (max 5MB)")
    dest.write_bytes(content)

    rel_path = f"profiles/{fname}"
    student.profile_image_path = rel_path
    db.commit()
    db.refresh(student)
    return _load_student(db, student.id)
