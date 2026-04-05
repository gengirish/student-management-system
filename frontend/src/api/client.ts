import type { Course, Enrollment, Grade, HealthResponse, Student, StudentListResponse, TokenPair, User } from './types'

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
  if (!res.ok) {
    return { status: 'error', database: 'disconnected' }
  }
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
  email: string
  password: string
  full_name: string
  student_id: string
  grade_year: number
}): Promise<TokenPair> {
  const res = await fetch(`${API_ORIGIN}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail || 'Registration failed')
  }
  return (await res.json()) as TokenPair
}

export async function fetchMe(): Promise<User> {
  const res = await apiFetch('/api/users/me')
  if (!res.ok) throw new Error('Failed to load profile')
  return (await res.json()) as User
}

export async function fetchStudents(params: { page?: number; page_size?: number; q?: string }): Promise<StudentListResponse> {
  const sp = new URLSearchParams()
  if (params.page) sp.set('page', String(params.page))
  if (params.page_size) sp.set('page_size', String(params.page_size))
  if (params.q) sp.set('q', params.q)
  const res = await apiFetch(`/api/students?${sp.toString()}`)
  if (!res.ok) throw new Error('Failed to load students')
  return (await res.json()) as StudentListResponse
}

export async function createStudent(body: {
  email: string
  password: string
  full_name: string
  student_id: string
  grade_year: number
  enrollment_date: string
}): Promise<Student> {
  const res = await apiFetch('/api/students', { method: 'POST', body: JSON.stringify(body) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail || 'Create failed')
  }
  return (await res.json()) as Student
}

export async function deleteStudent(id: string): Promise<void> {
  const res = await apiFetch(`/api/students/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Delete failed')
}

export async function uploadProfileImage(studentId: string, file: File): Promise<Student> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await apiFetch(`/api/students/${studentId}/profile-image`, { method: 'POST', body: fd })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail || 'Upload failed')
  }
  return (await res.json()) as Student
}

export async function fetchCourses(): Promise<Course[]> {
  const res = await apiFetch('/api/courses')
  if (!res.ok) throw new Error('Failed to load courses')
  return (await res.json()) as Course[]
}

export async function createCourse(body: {
  title: string
  description: string
  credits: number
  teacher_id: string
}): Promise<Course> {
  const res = await apiFetch('/api/courses', { method: 'POST', body: JSON.stringify(body) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail || 'Create failed')
  }
  return (await res.json()) as Course
}

export async function fetchEnrollments(): Promise<Enrollment[]> {
  const res = await apiFetch('/api/enrollments')
  if (!res.ok) throw new Error('Failed to load enrollments')
  return (await res.json()) as Enrollment[]
}

export async function createEnrollment(student_id: string, course_id: string): Promise<Enrollment> {
  const res = await apiFetch('/api/enrollments', {
    method: 'POST',
    body: JSON.stringify({ student_id, course_id }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail || 'Enrollment failed')
  }
  return (await res.json()) as Enrollment
}

export async function fetchGrades(): Promise<Grade[]> {
  const res = await apiFetch('/api/grades')
  if (!res.ok) throw new Error('Failed to load grades')
  return (await res.json()) as Grade[]
}

export async function createGrade(body: {
  enrollment_id: string
  score: number
  max_score: number
  letter_grade: string
  feedback: string
}): Promise<Grade> {
  const res = await apiFetch('/api/grades', { method: 'POST', body: JSON.stringify(body) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail || 'Grade failed')
  }
  return (await res.json()) as Grade
}

export async function fetchUsers(): Promise<User[]> {
  const res = await apiFetch('/api/users')
  if (!res.ok) throw new Error('Failed to load users')
  return (await res.json()) as User[]
}

export async function createUser(body: {
  email: string
  password: string
  full_name: string
  role: string
}): Promise<User> {
  const res = await apiFetch('/api/users', { method: 'POST', body: JSON.stringify(body) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail || 'Create user failed')
  }
  return (await res.json()) as User
}
