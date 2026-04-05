import { useEffect, useState } from 'react'
import { createUser, fetchUsers } from '@/api/client'
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
  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'teacher' as 'admin' | 'teacher' | 'student',
  })

  async function load() {
    setError('')
    try {
      setUsers(await fetchUsers())
    } catch {
      setError('Failed to load users.')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await createUser(form)
      setForm({ email: '', password: '', full_name: '', role: 'teacher' })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed')
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">User management</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Create user</CardTitle>
          <CardDescription>Provision administrators, teachers, or students. Student accounts created here do not add a student profile—use Students for full records.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void onSubmit(e)} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="un">Full name</Label>
              <Input
                id="un"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ue">Email</Label>
              <Input
                id="ue"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="up">Password</Label>
              <Input
                id="up"
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ur">Role</Label>
              <select
                id="ur"
                className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                value={form.role}
                onChange={(e) =>
                  setForm((f) => ({ ...f, role: e.target.value as 'admin' | 'teacher' | 'student' }))
                }
              >
                <option value="admin">Admin</option>
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Create user</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Directory</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{u.is_active ? 'Yes' : 'No'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
