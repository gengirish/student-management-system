import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { createGrade, deleteGrade, fetchEnrollments, fetchGrades, updateGrade } from '@/api/client'
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
  const [form, setForm] = useState({ enrollment_id: '', score: 85, max_score: 100, letter_grade: 'B', feedback: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ score: 0, max_score: 100, letter_grade: '', feedback: '' })

  async function load() {
    setError('')
    try { const [g, e] = await Promise.all([fetchGrades(), fetchEnrollments()]); setGrades(g); setEnrollments(e) }
    catch { setError('Failed to load grades.') }
  }

  useEffect(() => { void load() }, [])

  const gradedEnrollmentIds = new Set(grades.map((x) => x.enrollment_id))
  const openEnrollments = enrollments.filter((en) => !gradedEnrollmentIds.has(en.id))

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.enrollment_id) return
    setError('')
    try { await createGrade(form); setForm((f) => ({ ...f, enrollment_id: '', feedback: '' })); await load() }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to save grade') }
  }

  function startEdit(g: Grade) {
    setEditingId(g.id)
    setEditForm({ score: g.score, max_score: g.max_score, letter_grade: g.letter_grade, feedback: g.feedback })
  }

  async function onSaveEdit() {
    if (!editingId) return
    setError('')
    try { await updateGrade(editingId, editForm); setEditingId(null); await load() }
    catch (err) { setError(err instanceof Error ? err.message : 'Update failed') }
  }

  async function onDelete(id: string) {
    if (!confirm('Delete this grade?')) return
    try { await deleteGrade(id); await load() } catch { setError('Delete failed') }
  }

  const canManage = user?.role === 'teacher' || user?.role === 'admin'

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Grades</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {canManage && (
        <Card>
          <CardHeader><CardTitle>Assign grade</CardTitle><CardDescription>Each enrollment accepts one grade record.</CardDescription></CardHeader>
          <CardContent>
            <form onSubmit={(e) => void onSubmit(e)} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Enrollment (without grade yet)</Label>
                <select className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950" value={form.enrollment_id} onChange={(e) => setForm((f) => ({ ...f, enrollment_id: e.target.value }))} required>
                  <option value="">Select enrollment</option>
                  {openEnrollments.map((en) => <option key={en.id} value={en.id}>{en.student.user.full_name} — {en.course.title}</option>)}
                </select>
              </div>
              <div className="space-y-2"><Label>Score</Label><Input type="number" step="0.1" value={form.score} onChange={(e) => setForm((f) => ({ ...f, score: Number(e.target.value) }))} required /></div>
              <div className="space-y-2"><Label>Max score</Label><Input type="number" step="0.1" value={form.max_score} onChange={(e) => setForm((f) => ({ ...f, max_score: Number(e.target.value) }))} required /></div>
              <div className="space-y-2"><Label>Letter grade</Label><Input value={form.letter_grade} onChange={(e) => setForm((f) => ({ ...f, letter_grade: e.target.value }))} /></div>
              <div className="space-y-2 sm:col-span-2"><Label>Feedback</Label><Textarea value={form.feedback} onChange={(e) => setForm((f) => ({ ...f, feedback: e.target.value }))} rows={2} /></div>
              <div className="sm:col-span-2"><Button type="submit">Save grade</Button></div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Grade book</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Score</TableHead><TableHead>Letter</TableHead><TableHead>Student</TableHead><TableHead>Course</TableHead><TableHead>Feedback</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {grades.map((g) => {
                const en = enrollments.find((e) => e.id === g.enrollment_id)
                const isEditing = editingId === g.id
                return (
                  <TableRow key={g.id}>
                    <TableCell>
                      {isEditing ? <Input type="number" step="0.1" className="w-20" value={editForm.score} onChange={(e) => setEditForm((f) => ({ ...f, score: Number(e.target.value) }))} /> : `${g.score} / ${g.max_score}`}
                    </TableCell>
                    <TableCell>
                      {isEditing ? <Input className="w-16" value={editForm.letter_grade} onChange={(e) => setEditForm((f) => ({ ...f, letter_grade: e.target.value }))} /> : (g.letter_grade || '—')}
                    </TableCell>
                    <TableCell>{en?.student.user.full_name ?? '—'}</TableCell>
                    <TableCell>{en?.course.title ?? '—'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{isEditing ? <Input value={editForm.feedback} onChange={(e) => setEditForm((f) => ({ ...f, feedback: e.target.value }))} /> : (g.feedback || '—')}</TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-1">
                            <Button size="sm" onClick={() => void onSaveEdit()}>Save</Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="outline" onClick={() => startEdit(g)}>Edit</Button>
                            {user?.role === 'admin' && <Button size="sm" variant="destructive" onClick={() => void onDelete(g.id)}>Delete</Button>}
                          </div>
                        )}
                      </TableCell>
                    )}
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
