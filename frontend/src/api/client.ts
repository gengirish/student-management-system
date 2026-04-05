import type {
  AdminOverview, Announcement, Assignment, Attendance, Course, Enrollment,
  Grade, HealthResponse, Notification, Schedule, Student, StudentListResponse,
  StudentStats, TeacherStats, TokenPair, User,
} from './types'

export const API_ORIGIN = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || ''

async function tryRefresh(): Promise<boolean> {
  const rt = localStorage.getItem('refresh_token')
  if (!rt) return false
  const res = await fetch(`${API_ORIGIN}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: rt }),
  })
  if (!res.ok) {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    return false
  }
  const data = (await res.json()) as TokenPair
  localStorage.setItem('access_token', data.access_token)
  localStorage.setItem('refresh_token', data.refresh_token)
  return true
}

export async function apiFetch(path: string, init: RequestInit = {}, retried = false): Promise<Response> {
  const headers = new Headers(init.headers)
  const token = localStorage.getItem('access_token')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const res = await fetch(`${API_ORIGIN}${path}`, { ...init, headers })
  if (res.status === 401 && !retried && path !== '/api/auth/refresh' && path !== '/api/auth/login') {
    const ok = await tryRefresh()
    if (ok) return apiFetch(path, init, true)
  }
  return res
}

export async function logoutRequest(): Promise<void> {
  const rt = localStorage.getItem('refresh_token')
  if (rt) {
    await fetch(`${API_ORIGIN}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: rt }),
    }).catch(() => {})
  }
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

export async function checkHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_ORIGIN}/health`)
  if (!res.ok) return { status: 'error', database: 'disconnected' }
  return (await res.json()) as HealthResponse
}

export async function loginRequest(email: string, password: string): Promise<TokenPair> {
  const res = await fetch(`${API_ORIGIN}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail || 'Login failed')
  }
  return (await res.json()) as TokenPair
}

export async function registerRequest(body: {
  email: string; password: string; full_name: string; student_id: string; grade_year: number
}): Promise<TokenPair> {
  const res = await fetch(`${API_ORIGIN}/api/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error((err as { detail?: string }).detail || 'Registration failed') }
  return (await res.json()) as TokenPair
}

export async function forgotPassword(email: string): Promise<{ message: string; reset_token?: string }> {
  const res = await fetch(`${API_ORIGIN}/api/auth/forgot-password`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
  })
  return (await res.json()) as { message: string; reset_token?: string }
}

export async function resetPassword(token: string, new_password: string): Promise<{ message: string }> {
  const res = await fetch(`${API_ORIGIN}/api/auth/reset-password`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, new_password }),
  })
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error((err as { detail?: string }).detail || 'Reset failed') }
  return (await res.json()) as { message: string }
}

export async function fetchMe(): Promise<User> {
  const res = await apiFetch('/api/users/me')
  if (!res.ok) throw new Error('Failed to load profile')
  return (await res.json()) as User
}

// ─── Students ───
export async function fetchStudents(params: { page?: number; page_size?: number; q?: string }): Promise<StudentListResponse> {
  const sp = new URLSearchParams()
  if (params.page) sp.set('page', String(params.page))
  if (params.page_size) sp.set('page_size', String(params.page_size))
  if (params.q) sp.set('q', params.q)
  const res = await apiFetch(`/api/students?${sp.toString()}`)
  if (!res.ok) throw new Error('Failed to load students')
  return (await res.json()) as StudentListResponse
}

export async function createStudent(body: { email: string; password: string; full_name: string; student_id: string; grade_year: number; enrollment_date: string }): Promise<Student> {
  const res = await apiFetch('/api/students', { method: 'POST', body: JSON.stringify(body) })
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error((err as { detail?: string }).detail || 'Create failed') }
  return (await res.json()) as Student
}

export async function updateStudent(id: string, body: Record<string, unknown>): Promise<Student> {
  const res = await apiFetch(`/api/students/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error((err as { detail?: string }).detail || 'Update failed') }
  return (await res.json()) as Student
}

export async function deleteStudent(id: string): Promise<void> {
  const res = await apiFetch(`/api/students/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Delete failed')
}

export async function uploadProfileImage(studentId: string, file: File): Promise<Student> {
  const fd = new FormData(); fd.append('file', file)
  const res = await apiFetch(`/api/students/${studentId}/profile-image`, { method: 'POST', body: fd })
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error((err as { detail?: string }).detail || 'Upload failed') }
  return (await res.json()) as Student
}

// ─── Courses ───
export async function fetchCourses(): Promise<Course[]> {
  const res = await apiFetch('/api/courses')
  if (!res.ok) throw new Error('Failed to load courses')
  return (await res.json()) as Course[]
}

export async function createCourse(body: { title: string; description: string; credits: number; teacher_id: string }): Promise<Course> {
  const res = await apiFetch('/api/courses', { method: 'POST', body: JSON.stringify(body) })
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error((err as { detail?: string }).detail || 'Create failed') }
  return (await res.json()) as Course
}

export async function updateCourse(id: string, body: Record<string, unknown>): Promise<Course> {
  const res = await apiFetch(`/api/courses/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error((err as { detail?: string }).detail || 'Update failed') }
  return (await res.json()) as Course
}

export async function deleteCourse(id: string): Promise<void> {
  const res = await apiFetch(`/api/courses/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Delete failed')
}

// ─── Enrollments ───
export async function fetchEnrollments(): Promise<Enrollment[]> {
  const res = await apiFetch('/api/enrollments')
  if (!res.ok) throw new Error('Failed to load enrollments')
  return (await res.json()) as Enrollment[]
}

export async function createEnrollment(student_id: string, course_id: string): Promise<Enrollment> {
  const res = await apiFetch('/api/enrollments', { method: 'POST', body: JSON.stringify({ student_id, course_id }) })
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error((err as { detail?: string }).detail || 'Enrollment failed') }
  return (await res.json()) as Enrollment
}

export async function deleteEnrollment(id: string): Promise<void> {
  const res = await apiFetch(`/api/enrollments/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Delete failed')
}

// ─── Grades ───
export async function fetchGrades(): Promise<Grade[]> {
  const res = await apiFetch('/api/grades')
  if (!res.ok) throw new Error('Failed to load grades')
  return (await res.json()) as Grade[]
}

export async function createGrade(body: { enrollment_id: string; score: number; max_score: number; letter_grade: string; feedback: string }): Promise<Grade> {
  const res = await apiFetch('/api/grades', { method: 'POST', body: JSON.stringify(body) })
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error((err as { detail?: string }).detail || 'Grade failed') }
  return (await res.json()) as Grade
}

export async function updateGrade(id: string, body: Record<string, unknown>): Promise<Grade> {
  const res = await apiFetch(`/api/grades/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error((err as { detail?: string }).detail || 'Update failed') }
  return (await res.json()) as Grade
}

export async function deleteGrade(id: string): Promise<void> {
  const res = await apiFetch(`/api/grades/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Delete failed')
}

// ─── Users ───
export async function fetchUsers(): Promise<User[]> {
  const res = await apiFetch('/api/users')
  if (!res.ok) throw new Error('Failed to load users')
  return (await res.json()) as User[]
}

export async function createUser(body: { email: string; password: string; full_name: string; role: string }): Promise<User> {
  const res = await apiFetch('/api/users', { method: 'POST', body: JSON.stringify(body) })
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error((err as { detail?: string }).detail || 'Create user failed') }
  return (await res.json()) as User
}

export async function updateUser(id: string, body: Record<string, unknown>): Promise<User> {
  const res = await apiFetch(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error((err as { detail?: string }).detail || 'Update failed') }
  return (await res.json()) as User
}

// ─── Attendance ───
export async function fetchAttendance(params?: { course_id?: string; student_id?: string }): Promise<Attendance[]> {
  const sp = new URLSearchParams()
  if (params?.course_id) sp.set('course_id', params.course_id)
  if (params?.student_id) sp.set('student_id', params.student_id)
  const res = await apiFetch(`/api/attendance?${sp.toString()}`)
  if (!res.ok) throw new Error('Failed to load attendance')
  return (await res.json()) as Attendance[]
}

export async function bulkCreateAttendance(body: { date: string; records: { enrollment_id: string; status: string; notes: string }[] }): Promise<Attendance[]> {
  const res = await apiFetch('/api/attendance/bulk', { method: 'POST', body: JSON.stringify(body) })
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error((err as { detail?: string }).detail || 'Failed') }
  return (await res.json()) as Attendance[]
}

// ─── Announcements ───
export async function fetchAnnouncements(): Promise<Announcement[]> {
  const res = await apiFetch('/api/announcements')
  if (!res.ok) throw new Error('Failed to load announcements')
  return (await res.json()) as Announcement[]
}

export async function createAnnouncement(body: { title: string; body: string; scope: string; course_id?: string }): Promise<Announcement> {
  const res = await apiFetch('/api/announcements', { method: 'POST', body: JSON.stringify(body) })
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error((err as { detail?: string }).detail || 'Failed') }
  return (await res.json()) as Announcement
}

// ─── Notifications ───
export async function fetchNotifications(): Promise<Notification[]> {
  const res = await apiFetch('/api/notifications')
  if (!res.ok) return []
  return (await res.json()) as Notification[]
}

export async function fetchUnreadCount(): Promise<number> {
  const res = await apiFetch('/api/notifications/unread-count')
  if (!res.ok) return 0
  return ((await res.json()) as { count: number }).count
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiFetch('/api/notifications/read-all', { method: 'POST' })
}

// ─── Analytics ───
export async function fetchAdminOverview(): Promise<AdminOverview> {
  const res = await apiFetch('/api/analytics/overview')
  if (!res.ok) throw new Error('Failed')
  return (await res.json()) as AdminOverview
}

export async function fetchTeacherStats(): Promise<TeacherStats> {
  const res = await apiFetch('/api/analytics/teacher-stats')
  if (!res.ok) throw new Error('Failed')
  return (await res.json()) as TeacherStats
}

export async function fetchStudentStats(): Promise<StudentStats> {
  const res = await apiFetch('/api/analytics/student-stats')
  if (!res.ok) throw new Error('Failed')
  return (await res.json()) as StudentStats
}

// ─── Assignments ───
export async function fetchAssignments(courseId?: string): Promise<Assignment[]> {
  const sp = courseId ? `?course_id=${courseId}` : ''
  const res = await apiFetch(`/api/assignments${sp}`)
  if (!res.ok) throw new Error('Failed')
  return (await res.json()) as Assignment[]
}

export async function createAssignment(body: { course_id: string; title: string; description: string; max_score: number; weight: number; due_date?: string }): Promise<Assignment> {
  const res = await apiFetch('/api/assignments', { method: 'POST', body: JSON.stringify(body) })
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error((err as { detail?: string }).detail || 'Failed') }
  return (await res.json()) as Assignment
}

export async function deleteAssignment(id: string): Promise<void> {
  const res = await apiFetch(`/api/assignments/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Delete failed')
}

// ─── Schedule ───
export async function fetchSchedule(): Promise<Schedule[]> {
  const res = await apiFetch('/api/schedule')
  if (!res.ok) throw new Error('Failed')
  return (await res.json()) as Schedule[]
}

export async function createSchedule(body: { course_id: string; day_of_week: string; start_time: string; end_time: string; room: string }): Promise<Schedule> {
  const res = await apiFetch('/api/schedule', { method: 'POST', body: JSON.stringify(body) })
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error((err as { detail?: string }).detail || 'Failed') }
  return (await res.json()) as Schedule
}

export async function deleteSchedule(id: string): Promise<void> {
  const res = await apiFetch(`/api/schedule/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Delete failed')
}
