import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { fetchAdminOverview, fetchStudentStats, fetchTeacherStats } from '@/api/client'
import type { AdminOverview, StudentStats, TeacherStats } from '@/api/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

function AdminDashboard() {
  const [data, setData] = useState<AdminOverview | null>(null)
  useEffect(() => { void fetchAdminOverview().then(setData).catch(() => {}) }, [])
  if (!data) return <p className="text-sm text-zinc-500">Loading analytics…</p>
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Students" value={data.total_students} />
        <StatCard label="Courses" value={data.total_courses} />
        <StatCard label="Enrollments" value={data.total_enrollments} />
        <StatCard label="Attendance" value={data.attendance_rate != null ? `${data.attendance_rate}%` : '—'} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Grade distribution</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.grade_distribution}><XAxis dataKey="letter" /><YAxis /><Tooltip /><Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Enrollment trends</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.enrollment_trends}><XAxis dataKey="month" /><YAxis /><Tooltip /><Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} /></LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function TeacherDashboard() {
  const [data, setData] = useState<TeacherStats | null>(null)
  useEffect(() => { void fetchTeacherStats().then(setData).catch(() => {}) }, [])
  if (!data) return <p className="text-sm text-zinc-500">Loading…</p>
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="My courses" value={data.total_courses} />
        <StatCard label="Total students" value={data.total_students} />
        <StatCard label="Pending grades" value={data.pending_grades} />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Course stats</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.courses} layout="vertical"><XAxis type="number" /><YAxis type="category" dataKey="course_title" width={120} tick={{ fontSize: 12 }} /><Tooltip /><Bar dataKey="avg_score" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Avg score" /></BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </>
  )
}

function StudentDashboard() {
  const [data, setData] = useState<StudentStats | null>(null)
  useEffect(() => { void fetchStudentStats().then(setData).catch(() => {}) }, [])
  if (!data) return <p className="text-sm text-zinc-500">Loading…</p>
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard label="GPA (4.0 scale)" value={data.gpa != null ? data.gpa.toFixed(2) : '—'} />
      <StatCard label="Enrolled courses" value={data.total_courses} />
      <StatCard label="Attendance" value={data.attendance_rate != null ? `${data.attendance_rate}%` : '—'} sub={`${data.attendance_present}/${data.attendance_total} sessions`} />
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardDescription>{label}</CardDescription><CardTitle className="text-3xl tabular-nums">{value}</CardTitle></CardHeader>
      {sub && <CardContent><p className="text-xs text-zinc-500">{sub}</p></CardContent>}
    </Card>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Welcome{user ? `, ${user.full_name}` : ''}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Role: <span className="capitalize text-zinc-800 dark:text-zinc-200">{user?.role}</span>
        </p>
      </div>
      {user?.role === 'admin' && <AdminDashboard />}
      {user?.role === 'teacher' && <TeacherDashboard />}
      {user?.role === 'student' && <StudentDashboard />}
    </div>
  )
}
