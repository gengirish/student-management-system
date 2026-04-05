from typing import List, Optional

from pydantic import BaseModel


class GradeDistribution(BaseModel):
    letter: str
    count: int


class EnrollmentTrend(BaseModel):
    month: str
    count: int


class RecentActivity(BaseModel):
    type: str
    description: str
    timestamp: str


class AdminOverview(BaseModel):
    total_students: int
    total_courses: int
    total_enrollments: int
    total_grades: int
    attendance_rate: Optional[float]
    grade_distribution: List[GradeDistribution]
    enrollment_trends: List[EnrollmentTrend]
    recent_activity: List[RecentActivity]


class CourseStats(BaseModel):
    course_id: str
    course_title: str
    student_count: int
    avg_score: Optional[float]
    attendance_rate: Optional[float]
    ungraded_count: int


class TeacherStats(BaseModel):
    total_courses: int
    total_students: int
    pending_grades: int
    courses: List[CourseStats]


class StudentStats(BaseModel):
    gpa: Optional[float]
    total_courses: int
    total_credits: int
    attendance_rate: Optional[float]
    attendance_present: int
    attendance_total: int
