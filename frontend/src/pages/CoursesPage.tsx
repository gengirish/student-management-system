import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { createCourse, deleteCourse, fetchCourses, fetchUsers, updateCourse } from '@/api/client'
import type { Course, User } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export function CoursesPage() {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [teachers, setTeachers] = useState<User[]>([])
  const [error, setError] = useState('')
  const [form, setForm] = useState({ title: '', description: '', credits: 3, teacher_id: '' })
  const [editing, setEditing] = useState<Course | null>(null)
  const [editForm, setEditForm] = useState({ title: '', description: '', credits: 3, teacher_id: '' })

  const load = useCallback(async () => {
    setError('')
    try {
      const c = await fetchCourses()
      setCourses(c)
      if (user?.role === 'admin') {
        const u = await fetchUsers()
        const tlist = u.filter((x) => x.role === 'teacher')
        setTeachers(tlist)
        setForm((f) => { if (f.teacher_id) return f; const t = tlist[0]; return t ? { ...f, teacher_id: t.id } : f })
      }
    } catch { setError('Failed to load courses.') }
  }, [user?.role])

  useEffect(() => { void load() }, [load])

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.teacher_id) { setError('Select a teacher.'); return }
    setError('')
    try { await createCourse(form); setForm((f) => ({ ...f, title: '', description: '' })); await load() }
    catch (err) { setError(err instanceof Error ? err.message : 'Create failed') }
  }

  async function onDelete(id: string) {
    if (!confirm('Delete this course?')) return
    try { await deleteCourse(id); await load() } catch { setError('Delete failed') }
  }

  function startEdit(c: Course) {
    setEditing(c)
    setEditForm({ title: c.title, description: c.description, credits: c.credits, teacher_id: c.teacher_id })
  }

  async function onSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setError('')
    try { await updateCourse(editing.id, editForm); setEditing(null); await load() }
    catch (err) { setError(err instanceof Error ? err.message : 'Update failed') }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Courses</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {user?.role === 'admin' && (
        <Card>
          <CardHeader><CardTitle>Create course</CardTitle><CardDescription>Assign an instructor and credit value.</CardDescription></CardHeader>
          <CardContent>
            <form onSubmit={(e) => void onCreate(e)} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="title">Title</Label><Input id="title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required /></div>
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="desc">Description</Label><Textarea id="desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} /></div>
              <div className="space-y-2"><Label htmlFor="credits">Credits</Label><Input id="credits" type="number" min={1} max={30} value={form.credits} onChange={(e) => setForm((f) => ({ ...f, credits: Number(e.target.value) }))} required /></div>
              <div className="space-y-2">
                <Label htmlFor="teacher">Teacher</Label>
                <select id="teacher" className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950" value={form.teacher_id} onChange={(e) => setForm((f) => ({ ...f, teacher_id: e.target.value }))} required>
                  <option value="">Select teacher</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name} ({t.email})</option>)}
                </select>
              </div>
              <div className="sm:col-span-2"><Button type="submit">Create course</Button></div>
            </form>
          </CardContent>
        </Card>
      )}

      {editing && user?.role === 'admin' && (
        <Card className="border-blue-300 dark:border-blue-700">
          <CardHeader><CardTitle>Edit: {editing.title}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={(e) => void onSaveEdit(e)} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2"><Label>Title</Label><Input value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} required /></div>
              <div className="space-y-2 sm:col-span-2"><Label>Description</Label><Textarea value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} rows={3} /></div>
              <div className="space-y-2"><Label>Credits</Label><Input type="number" min={1} max={30} value={editForm.credits} onChange={(e) => setEditForm((f) => ({ ...f, credits: Number(e.target.value) }))} /></div>
              <div className="space-y-2">
                <Label>Teacher</Label>
                <select className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950" value={editForm.teacher_id} onChange={(e) => setEditForm((f) => ({ ...f, teacher_id: e.target.value }))}>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>
              <div className="flex gap-2 sm:col-span-2"><Button type="submit">Save</Button><Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button></div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {courses.map((c) => (
          <Card key={c.id}>
            <CardHeader>
              <CardTitle className="text-lg">{c.title}</CardTitle>
              <CardDescription>{c.credits} credits · Instructor: {c.teacher.full_name}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{c.description || 'No description.'}</p>
              {user?.role === 'admin' && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => startEdit(c)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => void onDelete(c.id)}>Delete</Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
