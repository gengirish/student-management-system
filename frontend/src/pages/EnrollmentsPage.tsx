import { useEffect, useState } from 'react'
import { createEnrollment, fetchCourses, fetchEnrollments, fetchStudents } from '@/api/client'
import type { Course, Enrollment, Student } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function EnrollmentsPage() {
  const [rows, setRows] = useState<Enrollment[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [studentId, setStudentId] = useState('')
  const [courseId, setCourseId] = useState('')
  const [error, setError] = useState('')

  async function load() {
    setError('')
    try {
      const [e, sRes, c] = await Promise.all([
        fetchEnrollments(),
        fetchStudents({ page: 1, page_size: 500 }),
        fetchCourses(),
      ])
      setRows(e)
      setStudents(sRes.items)
      setCourses(c)
    } catch {
      setError('Failed to load data.')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!studentId || !courseId) return
    setError('')
    try {
      await createEnrollment(studentId, courseId)
      setStudentId('')
      setCourseId('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enrollment failed')
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Enrollments</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Enroll student in course</CardTitle>
          <CardDescription>Administrators can link students to courses for grading.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void onSubmit(e)} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="stu">Student</Label>
              <select
                id="stu"
                className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
              >
                <option value="">Select student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.user.full_name} — {s.student_id}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="crs">Course</Label>
              <select
                id="crs"
                className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                required
              >
                <option value="">Select course</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Create enrollment</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All enrollments</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Enrolled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.student.user.full_name}</TableCell>
                  <TableCell>{r.course.title}</TableCell>
                  <TableCell>{new Date(r.enrolled_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
