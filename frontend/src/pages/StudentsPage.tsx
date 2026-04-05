import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { createStudent, deleteStudent, fetchStudents, updateStudent, uploadProfileImage } from '@/api/client'
import type { Student } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function StudentsPage() {
  const { user } = useAuth()
  const [data, setData] = useState<{ items: Student[]; total: number; pages: number } | null>(null)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [error, setError] = useState('')
  const [createForm, setCreateForm] = useState({ email: '', password: '', full_name: '', student_id: '', grade_year: 9, enrollment_date: new Date().toISOString().slice(0, 10) })
  const [uploading, setUploading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ full_name: '', grade_year: 9, email: '', student_id: '' })

  const load = useCallback(async () => {
    setError('')
    try { const res = await fetchStudents({ page, page_size: 10, q: q || undefined }); setData({ items: res.items, total: res.total, pages: res.pages }) }
    catch { setError('Failed to load students.') }
  }, [page, q])

  useEffect(() => { void load() }, [load])

  async function onCreate(e: React.FormEvent) {
    e.preventDefault(); setError('')
    try { await createStudent(createForm); setCreateForm((f) => ({ ...f, email: '', password: '', full_name: '', student_id: '' })); await load() }
    catch (err) { setError(err instanceof Error ? err.message : 'Create failed') }
  }

  async function onDelete(id: string) {
    if (!confirm('Delete this student and linked user account?')) return
    try { await deleteStudent(id); await load() } catch { setError('Delete failed') }
  }

  async function onUpload(studentId: string, file: File | null) {
    if (!file) return; setUploading(true); setError('')
    try { await uploadProfileImage(studentId, file); await load() }
    catch (err) { setError(err instanceof Error ? err.message : 'Upload failed') }
    finally { setUploading(false) }
  }

  function startEdit(s: Student) {
    setEditingId(s.id)
    setEditForm({ full_name: s.user.full_name, grade_year: s.grade_year, email: s.user.email, student_id: s.student_id })
  }

  async function onSaveEdit() {
    if (!editingId) return; setError('')
    const body: Record<string, unknown> = { full_name: editForm.full_name, grade_year: editForm.grade_year }
    if (user?.role === 'admin') { body.email = editForm.email; body.student_id = editForm.student_id }
    try { await updateStudent(editingId, body); setEditingId(null); await load() }
    catch (err) { setError(err instanceof Error ? err.message : 'Update failed') }
  }

  if (user?.role === 'student') {
    const s = data?.items[0]
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">My profile</h1>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!s ? <p className="text-sm text-zinc-500">Loading profile…</p> : (
          <Card>
            <CardHeader>
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <div className="h-24 w-24 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                  {s.profile_image_url ? <img src={s.profile_image_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-zinc-400">No photo</div>}
                </div>
                <div><CardTitle>{s.user.full_name}</CardTitle><CardDescription>{s.user.email}</CardDescription></div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p><span className="text-zinc-500">Student ID:</span> {s.student_id}</p>
              <p><span className="text-zinc-500">Grade / year:</span> {s.grade_year}</p>
              <p><span className="text-zinc-500">Enrolled:</span> {s.enrollment_date}</p>
              <div className="pt-2">
                <Label htmlFor="photo">Update profile photo</Label>
                <Input id="photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} className="mt-1" onChange={(e) => void onUpload(s.id, e.target.files?.[0] ?? null)} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Students</h1>
        <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); setPage(1); setQ(searchInput) }}>
          <Input placeholder="Search name, email, student ID…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="w-64" />
          <Button type="submit" variant="secondary">Search</Button>
        </form>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {user?.role === 'admin' && (
        <Card>
          <CardHeader><CardTitle>Add student</CardTitle><CardDescription>Creates a login with the student role.</CardDescription></CardHeader>
          <CardContent>
            <form onSubmit={(e) => void onCreate(e)} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Full name</Label><Input value={createForm.full_name} onChange={(e) => setCreateForm((f) => ({ ...f, full_name: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>Temporary password</Label><Input type="password" value={createForm.password} onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))} required minLength={8} /></div>
              <div className="space-y-2"><Label>Student ID</Label><Input value={createForm.student_id} onChange={(e) => setCreateForm((f) => ({ ...f, student_id: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>Grade / year</Label><Input type="number" min={1} value={createForm.grade_year} onChange={(e) => setCreateForm((f) => ({ ...f, grade_year: Number(e.target.value) }))} required /></div>
              <div className="space-y-2"><Label>Enrollment date</Label><Input type="date" value={createForm.enrollment_date} onChange={(e) => setCreateForm((f) => ({ ...f, enrollment_date: e.target.value }))} required /></div>
              <div className="sm:col-span-2"><Button type="submit">Create student</Button></div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0 pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead><TableHead>Student ID</TableHead><TableHead>Email</TableHead><TableHead>Grade</TableHead><TableHead>Enrolled</TableHead>
                {(user?.role === 'admin') && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.items.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    {editingId === s.id ? <Input className="w-32" value={editForm.full_name} onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))} /> : s.user.full_name}
                  </TableCell>
                  <TableCell>{editingId === s.id && user?.role === 'admin' ? <Input className="w-28" value={editForm.student_id} onChange={(e) => setEditForm((f) => ({ ...f, student_id: e.target.value }))} /> : s.student_id}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{s.user.email}</TableCell>
                  <TableCell>{editingId === s.id ? <Input type="number" className="w-16" value={editForm.grade_year} onChange={(e) => setEditForm((f) => ({ ...f, grade_year: Number(e.target.value) }))} /> : s.grade_year}</TableCell>
                  <TableCell>{s.enrollment_date}</TableCell>
                  {user?.role === 'admin' && (
                    <TableCell className="text-right">
                      {editingId === s.id ? (
                        <div className="flex justify-end gap-1">
                          <Button size="sm" onClick={() => void onSaveEdit()}>Save</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => startEdit(s)}>Edit</Button>
                          <label className="cursor-pointer text-sm text-zinc-600 underline dark:text-zinc-400">Photo<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void onUpload(s.id, e.target.files?.[0] ?? null)} /></label>
                          <Button type="button" variant="destructive" size="sm" onClick={() => void onDelete(s.id)}>Delete</Button>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data && data.items.length === 0 && <p className="p-6 text-center text-sm text-zinc-500">No students found.</p>}
        </CardContent>
      </Card>

      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <Badge variant="secondary">Page {page} of {data.pages}</Badge>
          <Button variant="outline" size="sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  )
}
