import io
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from app.deps import get_current_user, get_db
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.grade import Grade
from app.models.student import Student
from app.models.user import User, UserRole

router = APIRouter(prefix="/reports", tags=["reports"])


def _build_transcript_csv(student: Student, rows: list[dict]) -> str:
    lines = [
        f"Transcript for {student.user.full_name} ({student.student_id})",
        f"Grade/Year: {student.grade_year}  |  Enrolled: {student.enrollment_date}",
        "",
        "Course,Credits,Score,Max,Letter,Instructor,Feedback",
    ]
    for r in rows:
        lines.append(
            f'"{r["course"]}",{r["credits"]},{r["score"]},{r["max_score"]},'
            f'{r["letter"]},"{r["instructor"]}","{r["feedback"]}"'
        )
    return "\n".join(lines)


@router.get("/transcript/{student_id}")
def download_transcript(
    student_id: uuid.UUID,
    current: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> StreamingResponse:
    student = (
        db.query(Student)
        .options(joinedload(Student.user))
        .filter(Student.id == student_id)
        .first()
    )
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    if current.role == UserRole.STUDENT and student.user_id != current.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    if current.role == UserRole.TEACHER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    enrollments = (
        db.query(Enrollment)
        .options(joinedload(Enrollment.course).joinedload(Course.teacher))
        .filter(Enrollment.student_id == student.id)
        .all()
    )
    rows: list[dict] = []
    for e in enrollments:
        grade = db.query(Grade).filter(Grade.enrollment_id == e.id).first()
        rows.append({
            "course": e.course.title,
            "credits": e.course.credits,
            "score": grade.score if grade else "",
            "max_score": grade.max_score if grade else "",
            "letter": grade.letter_grade if grade else "",
            "instructor": e.course.teacher.full_name,
            "feedback": (grade.feedback if grade else "").replace('"', "'"),
        })

    csv_content = _build_transcript_csv(student, rows)
    buf = io.BytesIO(csv_content.encode("utf-8"))
    filename = f"transcript_{student.student_id}.csv"
    return StreamingResponse(
        buf,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/course-grades/{course_id}")
def download_course_grades(
    course_id: uuid.UUID,
    current: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> StreamingResponse:
    course = db.query(Course).options(joinedload(Course.teacher)).filter(Course.id == course_id).first()
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    if current.role == UserRole.TEACHER and course.teacher_id != current.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your course")
    if current.role == UserRole.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    enrollments = (
        db.query(Enrollment)
        .options(joinedload(Enrollment.student).joinedload(Student.user))
        .filter(Enrollment.course_id == course.id)
        .all()
    )
    lines = [
        f"Grade Sheet: {course.title} ({course.credits} credits)",
        f"Instructor: {course.teacher.full_name}",
        "",
        "Student Name,Student ID,Score,Max,Letter,Feedback",
    ]
    for e in enrollments:
        grade = db.query(Grade).filter(Grade.enrollment_id == e.id).first()
        lines.append(
            f'"{e.student.user.full_name}",{e.student.student_id},'
            f'{grade.score if grade else ""},'
            f'{grade.max_score if grade else ""},'
            f'{grade.letter_grade if grade else ""},'
            f'"{(grade.feedback if grade else "").replace(chr(34), chr(39))}"'
        )
    csv = "\n".join(lines)
    buf = io.BytesIO(csv.encode("utf-8"))
    filename = f"grades_{course.title.replace(' ', '_')}.csv"
    return StreamingResponse(
        buf,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
