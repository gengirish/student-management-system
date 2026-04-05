import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { createAnnouncement, fetchAnnouncements, fetchCourses } from '@/api/client'
import type { Announcement, Course } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export function AnnouncementsPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<Announcement[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [error, setError] = useState('')
  const [form, setForm] = useState({ title: '', body: '', scope: 'global' as 'global' | 'course', course_id: '' })

  async function load() {
    try {
      const [a, c] = await Promise.all([fetchAnnouncements(), fetchCourses()])
      setItems(a); setCourses(c)
    } catch { setError('Failed to load announcements') }
  }

  useEffect(() => { void load() }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await createAnnouncement({
        title: form.title, body: form.body, scope: form.scope,
        ...(form.scope === 'course' && form.course_id ? { course_id: form.course_id } : {}),
      })
      setForm({ title: '', body: '', scope: 'global', course_id: '' })
      await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed') }
  }

  const canPost = user?.role === 'admin' || user?.role === 'teacher'

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Announcements</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {canPost && (
        <Card>
          <CardHeader>
            <CardTitle>Post announcement</CardTitle>
            <CardDescription>{user?.role === 'teacher' ? 'Post to your courses.' : 'Post globally or to a course.'}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void onSubmit(e)} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Body</Label>
                <Textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} rows={3} required />
              </div>
              {user?.role === 'admin' && (
                <div className="space-y-2">
                  <Label>Scope</Label>
                  <select className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950" value={form.scope} onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value as 'global' | 'course' }))}>
                    <option value="global">Global</option>
                    <option value="course">Course</option>
                  </select>
                </div>
              )}
              {(form.scope === 'course' || user?.role === 'teacher') && (
                <div className="space-y-2">
                  <Label>Course</Label>
                  <select className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950" value={form.course_id} onChange={(e) => setForm((f) => ({ ...f, course_id: e.target.value, scope: 'course' }))} required>
                    <option value="">Select course</option>
                    {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
              )}
              <div className="sm:col-span-2"><Button type="submit">Post</Button></div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {items.map((a) => (
          <Card key={a.id}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{a.title}</CardTitle>
                <Badge variant="secondary">{a.scope}</Badge>
              </div>
              <CardDescription>By {a.author.full_name} · {new Date(a.created_at).toLocaleDateString()}</CardDescription>
            </CardHeader>
            <CardContent><p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">{a.body}</p></CardContent>
          </Card>
        ))}
        {items.length === 0 && <p className="text-center text-sm text-zinc-500">No announcements yet.</p>}
      </div>
    </div>
  )
}
