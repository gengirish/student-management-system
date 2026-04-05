import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { bulkCreateAttendance, fetchAttendance, fetchCourses, fetchEnrollments } from '@/api/client'
import type { Attendance, AttendanceStatus, Course, Enrollment } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  absent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  late: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  excused: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
}

export function AttendancePage() {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [records, setRecords] = useState<Attendance[]>([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({})
  const [error, setError] = useState('')

  useEffect(() => {
    void (async () => {
      try {
        const [c, e, a] = await Promise.all([fetchCourses(), fetchEnrollments(), fetchAttendance()])
        setCourses(c); setEnrollments(e); setRecords(a)
      } catch { setError('Failed to load data') }
    })()
  }, [])

  const courseEnrollments = enrollments.filter((e) => e.course_id === selectedCourse)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCourse) return
    setError('')
    try {
      const recs = courseEnrollments.map((en) => ({
        enrollment_id: en.id,
        status: statuses[en.id] || 'present',
        notes: '',
      }))
      await bulkCreateAttendance({ date, records: recs })
      const a = await fetchAttendance()
      setRecords(a)
      setStatuses({})
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed') }
  }

  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin'

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Attendance</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {isTeacherOrAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Mark attendance</CardTitle>
            <CardDescription>Select a course and date, then set status for each student.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Course</Label>
                  <select className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950" value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} required>
                    <option value="">Select course</option>
                    {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                </div>
              </div>
              {selectedCourse && courseEnrollments.length > 0 && (
                <Table>
                  <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {courseEnrollments.map((en) => (
                      <TableRow key={en.id}>
                        <TableCell>{en.student.user.full_name}</TableCell>
                        <TableCell>
                          <select className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950" value={statuses[en.id] || 'present'} onChange={(e) => setStatuses((s) => ({ ...s, [en.id]: e.target.value as AttendanceStatus }))}>
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="late">Late</option>
                            <option value="excused">Excused</option>
                          </select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <Button type="submit" disabled={!selectedCourse || courseEnrollments.length === 0}>Save attendance</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Attendance records</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Enrollment</TableHead></TableRow></TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.date}</TableCell>
                  <TableCell><Badge className={STATUS_COLORS[r.status]}>{r.status}</Badge></TableCell>
                  <TableCell className="text-xs text-zinc-500">{r.enrollment_id.slice(0, 8)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {records.length === 0 && <p className="p-6 text-center text-sm text-zinc-500">No attendance records yet.</p>}
        </CardContent>
      </Card>
    </div>
  )
}
