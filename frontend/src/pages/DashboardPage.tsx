import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { fetchCourses, fetchGrades, fetchStudents } from '@/api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<{ students: number; courses: number; grades: number } | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const [sRes, cRes, gRes] = await Promise.all([
          fetchStudents({ page: 1, page_size: 1 }).catch(() => ({ total: 0 })),
          fetchCourses().catch(() => []),
          fetchGrades().catch(() => []),
        ])
        setStats({
          students: 'total' in sRes ? sRes.total : 0,
          courses: Array.isArray(cRes) ? cRes.length : 0,
          grades: Array.isArray(gRes) ? gRes.length : 0,
        })
      } catch {
        setStats({ students: 0, courses: 0, grades: 0 })
      }
    })()
  }, [])

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

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Students visible to you</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{stats?.students ?? '—'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500">Admins see the full directory; students see only themselves.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Courses</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{stats?.courses ?? '—'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500">Active catalog available under Courses.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Grades</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{stats?.grades ?? '—'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500">Records you are allowed to view.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
