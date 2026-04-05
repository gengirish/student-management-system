import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { createGrade, fetchEnrollments, fetchGrades } from '@/api/client'
import type { Enrollment, Grade } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

export function GradesPage() {
  const { user } = useAuth()
  const [grades, setGrades] = useState<Grade[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    enrollment_id: '',
    score: 85,
    max_score: 100,
    letter_grade: 'B',
    feedback: '',
  })

  async function load() {
    setError('')
    try {
      const [g, e] = await Promise.all([fetchGrades(), fetchEnrollments()])
      setGrades(g)
      setEnrollments(e)
    } catch {
      setError('Failed to load grades.')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const gradedEnrollmentIds = new Set(grades.map((x) => x.enrollment_id))
  const openEnrollments = enrollments.filter((en) => !gradedEnrollmentIds.has(en.id))

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.enrollment_id) return
    setError('')
    try {
      await createGrade(form)
      setForm((f) => ({ ...f, enrollment_id: '', feedback: '' }))
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save grade')
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Grades</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {(user?.role === 'teacher' || user?.role === 'admin') && (
        <Card>
          <CardHeader>
            <CardTitle>Assign grade</CardTitle>
            <CardDescription>
              Teachers may grade enrollments for their own courses. Each enrollment accepts one grade record.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void onSubmit(e)} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="enr">Enrollment (without grade yet)</Label>
                <select
                  id="enr"
                  className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                  value={form.enrollment_id}
                  onChange={(e) => setForm((f) => ({ ...f, enrollment_id: e.target.value }))}
                  required
                >
                  <option value="">Select enrollment</option>
                  {openEnrollments.map((en) => (
                    <option key={en.id} value={en.id}>
                      {en.student.user.full_name} — {en.course.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="score">Score</Label>
                <Input
                  id="score"
                  type="number"
                  step="0.1"
                  value={form.score}
                  onChange={(e) => setForm((f) => ({ ...f, score: Number(e.target.value) }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max">Max score</Label>
                <Input
                  id="max"
                  type="number"
                  step="0.1"
                  value={form.max_score}
                  onChange={(e) => setForm((f) => ({ ...f, max_score: Number(e.target.value) }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="letter">Letter grade</Label>
                <Input
                  id="letter"
                  value={form.letter_grade}
                  onChange={(e) => setForm((f) => ({ ...f, letter_grade: e.target.value }))}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="fb">Feedback</Label>
                <Textarea
                  id="fb"
                  value={form.feedback}
                  onChange={(e) => setForm((f) => ({ ...f, feedback: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit">Save grade</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Grade book</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Score</TableHead>
                <TableHead>Letter</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Instructor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grades.map((g) => {
                const en = enrollments.find((e) => e.id === g.enrollment_id)
                return (
                  <TableRow key={g.id}>
                    <TableCell>
                      {g.score} / {g.max_score}
                    </TableCell>
                    <TableCell>{g.letter_grade || '—'}</TableCell>
                    <TableCell>{en?.student.user.full_name ?? '—'}</TableCell>
                    <TableCell>{en?.course.title ?? '—'}</TableCell>
                    <TableCell>{en?.course.teacher.full_name ?? '—'}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          {grades.length === 0 && <p className="p-6 text-center text-sm text-zinc-500">No grades to show.</p>}
        </CardContent>
      </Card>
    </div>
  )
}
