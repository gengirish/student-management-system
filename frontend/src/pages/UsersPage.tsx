import { useEffect, useState } from 'react'
import { createUser, fetchUsers, updateUser } from '@/api/client'
import type { User } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [error, setError] = useState('')
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'teacher' as 'admin' | 'teacher' | 'student' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ full_name: '', password: '' })

  async function load() { setError(''); try { setUsers(await fetchUsers()) } catch { setError('Failed to load users.') } }
  useEffect(() => { void load() }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    try { await createUser(form); setForm({ email: '', password: '', full_name: '', role: 'teacher' }); await load() }
    catch (err) { setError(err instanceof Error ? err.message : 'Create failed') }
  }

  async function toggleActive(u: User) {
    try { await updateUser(u.id, { is_active: !u.is_active }); await load() }
    catch { setError('Update failed') }
  }

  function startEdit(u: User) { setEditingId(u.id); setEditForm({ full_name: u.full_name, password: '' }) }

  async function onSaveEdit() {
    if (!editingId) return
    const body: Record<string, unknown> = { full_name: editForm.full_name }
    if (editForm.password) body.password = editForm.password
    try { await updateUser(editingId, body); setEditingId(null); await load() }
    catch (err) { setError(err instanceof Error ? err.message : 'Update failed') }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">User management</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Card>
        <CardHeader><CardTitle>Create user</CardTitle><CardDescription>Provision administrators, teachers, or students.</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={(e) => void onSubmit(e)} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} required /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required /></div>
            <div className="space-y-2"><Label>Password</Label><Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required minLength={8} /></div>
            <div className="space-y-2">
              <Label>Role</Label>
              <select className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as 'admin' | 'teacher' | 'student' }))}>
                <option value="admin">Admin</option><option value="teacher">Teacher</option><option value="student">Student</option>
              </select>
            </div>
            <div className="sm:col-span-2"><Button type="submit">Create user</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Directory</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Active</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {editingId === u.id ? <Input className="w-40" value={editForm.full_name} onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))} /> : u.full_name}
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell><Badge variant="secondary" className="capitalize">{u.role}</Badge></TableCell>
                  <TableCell>
                    <button type="button" onClick={() => void toggleActive(u)} className={`rounded px-2 py-0.5 text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === u.id ? (
                      <div className="flex justify-end gap-1">
                        <Input type="password" placeholder="New password" className="w-32" value={editForm.password} onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))} />
                        <Button size="sm" onClick={() => void onSaveEdit()}>Save</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => startEdit(u)}>Edit</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
