"""
Populate the database with demo users, courses, enrollments, and grades.
Safe to run multiple times: skips seeding if the admin account already exists.

Usage (from backend directory):
    set PYTHONPATH=.
    python seed.py
"""

from __future__ import annotations

import sys
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.grade import Grade
from app.models.student import Student
from app.models.user import User, UserRole


def main() -> None:
    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == "admin@demo.school").first():
            print("Demo data already present (admin@demo.school exists). Skipping seed.")
            return

        admin = User(
            email="admin@demo.school",
            hashed_password=hash_password("Admin123!"),
            full_name="System Administrator",
            role=UserRole.ADMIN,
            is_active=True,
            created_at=datetime.now(timezone.utc),
        )
        teacher = User(
            email="teacher@demo.school",
            hashed_password=hash_password("Teacher123!"),
            full_name="Jane Teacher",
            role=UserRole.TEACHER,
            is_active=True,
            created_at=datetime.now(timezone.utc),
        )
        db.add_all([admin, teacher])
        db.flush()

        u1 = User(
            email="alice.student@demo.school",
            hashed_password=hash_password("Student123!"),
            full_name="Alice Student",
            role=UserRole.STUDENT,
            is_active=True,
            created_at=datetime.now(timezone.utc),
        )
        u2 = User(
            email="bob.student@demo.school",
            hashed_password=hash_password("Student123!"),
            full_name="Bob Student",
            role=UserRole.STUDENT,
            is_active=True,
            created_at=datetime.now(timezone.utc),
        )
        db.add_all([u1, u2])
        db.flush()

        s1 = Student(
            user_id=u1.id,
            student_id="STU-2026-001",
            grade_year=10,
            enrollment_date=date(2025, 9, 1),
            updated_at=datetime.now(timezone.utc),
        )
        s2 = Student(
            user_id=u2.id,
            student_id="STU-2026-002",
            grade_year=11,
            enrollment_date=date(2025, 9, 1),
            updated_at=datetime.now(timezone.utc),
        )
        db.add_all([s1, s2])
        db.flush()

        c1 = Course(
            title="Introduction to Computer Science",
            description="Algorithms, data structures, and Python programming fundamentals.",
            credits=4,
            teacher_id=teacher.id,
            created_at=datetime.now(timezone.utc),
        )
        c2 = Course(
            title="World History",
            description="Survey of major civilizations from antiquity to the modern era.",
            credits=3,
            teacher_id=teacher.id,
            created_at=datetime.now(timezone.utc),
        )
        db.add_all([c1, c2])
        db.flush()

        e1 = Enrollment(student_id=s1.id, course_id=c1.id, enrolled_at=datetime.now(timezone.utc))
        e2 = Enrollment(student_id=s1.id, course_id=c2.id, enrolled_at=datetime.now(timezone.utc))
        e3 = Enrollment(student_id=s2.id, course_id=c1.id, enrolled_at=datetime.now(timezone.utc))
        db.add_all([e1, e2, e3])
        db.flush()

        g1 = Grade(
            enrollment_id=e1.id,
            score=92.0,
            max_score=100.0,
            letter_grade="A",
            feedback="Excellent work on the final project.",
            graded_by_user_id=teacher.id,
            graded_at=datetime.now(timezone.utc),
        )
        g2 = Grade(
            enrollment_id=e2.id,
            score=88.0,
            max_score=100.0,
            letter_grade="B+",
            feedback="Strong essays; improve citation format.",
            graded_by_user_id=teacher.id,
            graded_at=datetime.now(timezone.utc),
        )
        g3 = Grade(
            enrollment_id=e3.id,
            score=76.5,
            max_score=100.0,
            letter_grade="C+",
            feedback="Review loops and recursion before the midterm.",
            graded_by_user_id=teacher.id,
            graded_at=datetime.now(timezone.utc),
        )
        db.add_all([g1, g2, g3])
        db.commit()
        print("Seed completed successfully.")
        print("  Admin:    admin@demo.school    / Admin123!")
        print("  Teacher:  teacher@demo.school  / Teacher123!")
        print("  Students: alice.student@demo.school, bob.student@demo.school / Student123!")
    finally:
        db.close()


if __name__ == "__main__":
    main()
