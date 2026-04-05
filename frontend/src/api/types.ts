export type UserRole = 'admin' | 'teacher' | 'student'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface Student {
  id: string
  user_id: string
  student_id: string
  grade_year: number
  enrollment_date: string
  profile_image_path: string | null
  profile_image_url: string | null
  updated_at: string
  user: User
}

export interface StudentListResponse {
  items: Student[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface Course {
  id: string
  title: string
  description: string
  credits: number
  teacher_id: string
  created_at: string
  teacher: User
}

export interface Enrollment {
  id: string
  student_id: string
  course_id: string
  enrolled_at: string
  student: Student
  course: Course
}

export interface Grade {
  id: string
  enrollment_id: string
  score: number
  max_score: number
  letter_grade: string
  feedback: string
  graded_by_user_id: string | null
  graded_at: string
  graded_by: User | null
}

export interface TokenPair {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface HealthResponse {
  status: string
  database: string
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

export interface Attendance {
  id: string
  enrollment_id: string
  date: string
  status: AttendanceStatus
  notes: string
  marked_by_user_id: string | null
  created_at: string
}

export type AnnouncementScope = 'global' | 'course'

export interface Announcement {
  id: string
  title: string
  body: string
  author_id: string
  scope: AnnouncementScope
  course_id: string | null
  created_at: string
  author: User
}

export interface Notification {
  id: string
  user_id: string
  message: string
  link: string | null
  is_read: boolean
  created_at: string
}

export interface Assignment {
  id: string
  course_id: string
  title: string
  description: string
  max_score: number
  weight: number
  due_date: string | null
  created_by_user_id: string | null
  created_at: string
  created_by: User | null
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

export interface Schedule {
  id: string
  course_id: string
  day_of_week: DayOfWeek
  start_time: string
  end_time: string
  room: string
  created_at: string
  course: Course
}

export interface GradeDistribution { letter: string; count: number }
export interface EnrollmentTrend { month: string; count: number }
export interface RecentActivity { type: string; description: string; timestamp: string }

export interface AdminOverview {
  total_students: number
  total_courses: number
  total_enrollments: number
  total_grades: number
  attendance_rate: number | null
  grade_distribution: GradeDistribution[]
  enrollment_trends: EnrollmentTrend[]
  recent_activity: RecentActivity[]
}

export interface CourseStatsItem {
  course_id: string
  course_title: string
  student_count: number
  avg_score: number | null
  attendance_rate: number | null
  ungraded_count: number
}

export interface TeacherStats {
  total_courses: number
  total_students: number
  pending_grades: number
  courses: CourseStatsItem[]
}

export interface StudentStats {
  gpa: number | null
  total_courses: number
  total_credits: number
  attendance_rate: number | null
  attendance_present: number
  attendance_total: number
}
