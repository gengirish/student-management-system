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
