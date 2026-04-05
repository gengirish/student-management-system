from collections import Counter
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.models.attendance import Attendance, AttendanceStatus
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.grade import Grade
from app.models.student import Student
from app.models.user import User, UserRole
from app.schemas.analytics import (
    AdminOverview,
    CourseStats,
    EnrollmentTrend,
    GradeDistribution,
    RecentActivity,
    StudentStats,
    TeacherStats,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/overview", response_model=AdminOverview)
def admin_overview(
    current: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> AdminOverview:
    if current.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")

    total_students = db.query(Student).count()
    total_courses = db.query(Course).count()
    total_enrollments = db.query(Enrollment).count()
    grades = db.query(Grade).all()
    total_grades = len(grades)

    letter_counts = Counter(g.letter_grade or "N/A" for g in grades)
    grade_distribution = [
        GradeDistribution(letter=k, count=v) for k, v in sorted(letter_counts.items())
    ]

    trend_rows = (
        db.query(
            func.to_char(Enrollment.enrolled_at, "YYYY-MM").label("month"),
            func.count().label("cnt"),
        )
        .group_by("month")
        .order_by("month")
        .limit(12)
        .all()
    )
    enrollment_trends = [EnrollmentTrend(month=r.month, count=r.cnt) for r in trend_rows]

    att_total = db.query(Attendance).count()
    att_present = db.query(Attendance).filter(
        Attendance.status.in_([AttendanceStatus.PRESENT, AttendanceStatus.LATE])
    ).count()
    attendance_rate = (att_present / att_total * 100) if att_total else None

    recent_enrollments = (
        db.query(Enrollment)
        .order_by(Enrollment.enrolled_at.desc())
        .limit(5)
        .all()
    )
    recent_activity = [
        RecentActivity(
            type="enrollment",
            description=f"New enrollment #{str(e.id)[:8]}",
            timestamp=e.enrolled_at.isoformat(),
        )
        for e in recent_enrollments
    ]

    return AdminOverview(
        total_students=total_students,
        total_courses=total_courses,
        total_enrollments=total_enrollments,
        total_grades=total_grades,
        attendance_rate=round(attendance_rate, 1) if attendance_rate is not None else None,
        grade_distribution=grade_distribution,
        enrollment_trends=enrollment_trends,
        recent_activity=recent_activity,
    )


@router.get("/teacher-stats", response_model=TeacherStats)
def teacher_stats(
    current: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> TeacherStats:
    if current.role != UserRole.TEACHER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Teacher only")

    courses = db.query(Course).filter(Course.teacher_id == current.id).all()
    total_students_set: set = set()
    pending = 0
    course_stats: list[CourseStats] = []

    for c in courses:
        enrollments = db.query(Enrollment).filter(Enrollment.course_id == c.id).all()
        graded_enrollment_ids = set(
            g.enrollment_id for g in db.query(Grade).filter(
                Grade.enrollment_id.in_([e.id for e in enrollments])
            ).all()
        ) if enrollments else set()
        ungraded = len(enrollments) - len(graded_enrollment_ids)
        pending += ungraded
        for e in enrollments:
            total_students_set.add(e.student_id)

        scores = [
            g.score for g in db.query(Grade).filter(
                Grade.enrollment_id.in_([e.id for e in enrollments])
            ).all()
        ] if enrollments else []
        avg = round(sum(scores) / len(scores), 1) if scores else None

        att_total = db.query(Attendance).filter(
            Attendance.enrollment_id.in_([e.id for e in enrollments])
        ).count() if enrollments else 0
        att_present = db.query(Attendance).filter(
            Attendance.enrollment_id.in_([e.id for e in enrollments]),
            Attendance.status.in_([AttendanceStatus.PRESENT, AttendanceStatus.LATE]),
        ).count() if enrollments else 0
        att_rate = round(att_present / att_total * 100, 1) if att_total else None

        course_stats.append(CourseStats(
            course_id=str(c.id),
            course_title=c.title,
            student_count=len(enrollments),
            avg_score=avg,
            attendance_rate=att_rate,
            ungraded_count=ungraded,
        ))

    return TeacherStats(
        total_courses=len(courses),
        total_students=len(total_students_set),
        pending_grades=pending,
        courses=course_stats,
    )


@router.get("/student-stats", response_model=StudentStats)
def student_stats(
    current: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> StudentStats:
    if current.role != UserRole.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student only")

    profile = db.query(Student).filter(Student.user_id == current.id).first()
    if profile is None:
        return StudentStats(gpa=None, total_courses=0, total_credits=0,
                            attendance_rate=None, attendance_present=0, attendance_total=0)

    enrollments = db.query(Enrollment).filter(Enrollment.student_id == profile.id).all()
    enr_ids = [e.id for e in enrollments]

    grades = db.query(Grade).filter(Grade.enrollment_id.in_(enr_ids)).all() if enr_ids else []
    total_credits = 0
    weighted_sum = 0.0
    for g in grades:
        enrollment = next((e for e in enrollments if e.id == g.enrollment_id), None)
        if enrollment:
            course = db.query(Course).filter(Course.id == enrollment.course_id).first()
            if course:
                pct = (g.score / g.max_score) * 4.0 if g.max_score else 0
                weighted_sum += pct * course.credits
                total_credits += course.credits
    gpa = round(weighted_sum / total_credits, 2) if total_credits else None

    att_total = db.query(Attendance).filter(Attendance.enrollment_id.in_(enr_ids)).count() if enr_ids else 0
    att_present = db.query(Attendance).filter(
        Attendance.enrollment_id.in_(enr_ids),
        Attendance.status.in_([AttendanceStatus.PRESENT, AttendanceStatus.LATE]),
    ).count() if enr_ids else 0
    att_rate = round(att_present / att_total * 100, 1) if att_total else None

    return StudentStats(
        gpa=gpa,
        total_courses=len(enrollments),
        total_credits=total_credits,
        attendance_rate=att_rate,
        attendance_present=att_present,
        attendance_total=att_total,
    )
