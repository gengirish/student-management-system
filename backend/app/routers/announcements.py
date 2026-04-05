import uuid
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.deps import get_current_user, get_db
from app.models.announcement import Announcement, AnnouncementScope
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.notification import Notification
from app.models.student import Student
from app.models.user import User, UserRole
from app.schemas.announcement import AnnouncementCreate, AnnouncementOut

router = APIRouter(prefix="/announcements", tags=["announcements"])


@router.post("", response_model=AnnouncementOut, status_code=status.HTTP_201_CREATED)
def create_announcement(
    payload: AnnouncementCreate,
    current: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> Announcement:
    if current.role not in (UserRole.ADMIN, UserRole.TEACHER):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    if payload.scope == AnnouncementScope.COURSE:
        if payload.course_id is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="course_id required for course scope")
        course = db.query(Course).filter(Course.id == payload.course_id).first()
        if course is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
        if current.role == UserRole.TEACHER and course.teacher_id != current.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your course")
    elif current.role == UserRole.TEACHER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Teachers can only post course announcements")

    row = Announcement(
        title=payload.title.strip(),
        body=payload.body,
        author_id=current.id,
        scope=payload.scope,
        course_id=payload.course_id if payload.scope == AnnouncementScope.COURSE else None,
    )
    db.add(row)
    db.flush()

    if payload.scope == AnnouncementScope.GLOBAL:
        users = db.query(User).filter(User.id != current.id, User.is_active.is_(True)).all()
    else:
        enrollments = db.query(Enrollment).filter(Enrollment.course_id == payload.course_id).all()
        student_ids = [e.student_id for e in enrollments]
        students = db.query(Student).filter(Student.id.in_(student_ids)).all() if student_ids else []
        user_ids = [s.user_id for s in students]
        users = db.query(User).filter(User.id.in_(user_ids), User.id != current.id).all() if user_ids else []

    for u in users:
        db.add(Notification(user_id=u.id, message=f"New announcement: {payload.title}", link="/announcements"))
    db.commit()
    db.refresh(row)
    return db.query(Announcement).options(joinedload(Announcement.author)).filter(Announcement.id == row.id).first()


@router.get("", response_model=List[AnnouncementOut])
def list_announcements(
    current: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
    course_id: Optional[uuid.UUID] = Query(None),
) -> List[Announcement]:
    q = db.query(Announcement).options(joinedload(Announcement.author))
    if current.role == UserRole.STUDENT:
        profile = db.query(Student).filter(Student.user_id == current.id).first()
        enrolled_course_ids: list[uuid.UUID] = []
        if profile:
            enrollments = db.query(Enrollment).filter(Enrollment.student_id == profile.id).all()
            enrolled_course_ids = [e.course_id for e in enrollments]
        q = q.filter(
            (Announcement.scope == AnnouncementScope.GLOBAL)
            | (Announcement.course_id.in_(enrolled_course_ids))
        )
    elif current.role == UserRole.TEACHER:
        my_course_ids = [c.id for c in db.query(Course).filter(Course.teacher_id == current.id).all()]
        q = q.filter(
            (Announcement.scope == AnnouncementScope.GLOBAL)
            | (Announcement.course_id.in_(my_course_ids))
        )
    if course_id:
        q = q.filter(Announcement.course_id == course_id)
    return q.order_by(Announcement.created_at.desc()).limit(100).all()
