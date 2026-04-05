import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { createSchedule, deleteSchedule, fetchCourses, fetchSchedule } from '@/api/client'
import type { Course, DayOfWeek, Schedule } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_SHORT: Record<DayOfWeek, string> = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' }

export function SchedulePage() {
  const { user } = useAuth()
  const [items, setItems] = useState<Schedule[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [error, setError] = useState('')
  const [form, setForm] = useState({ course_id: '', day_of_week: 'monday' as DayOfWeek, start_time: '09:00', end_time: '10:00', room: '' })

  async function load() {
    try {
      const [s, c] = await Promise.all([fetchSchedule(), fetchCourses()])
      setItems(s); setCourses(c)
    } catch { setError('Failed to load schedule') }
  }

  useEffect(() => { void load() }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await createSchedule(form)
      setForm((f) => ({ ...f, course_id: '', room: '' }))
      await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed') }
  }

  async function onDelete(id: string) {
    if (!confirm('Remove this schedule entry?')) return
    try { await deleteSchedule(id); await load() } catch { setError('Delete failed') }
  }

  const grouped = DAYS.map((day) => ({ day, slots: items.filter((s) => s.day_of_week === day) })).filter((g) => g.slots.length > 0)

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Timetable</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {user?.role === 'admin' && (
        <Card>
          <CardHeader><CardTitle>Add schedule entry</CardTitle><CardDescription>Assign a time slot to a course.</CardDescription></CardHeader>
          <CardContent>
            <form onSubmit={(e) => void onSubmit(e)} className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Course</Label>
                <select className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950" value={form.course_id} onChange={(e) => setForm((f) => ({ ...f, course_id: e.target.value }))} required>
                  <option value="">Select course</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Day</Label>
                <select className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950" value={form.day_of_week} onChange={(e) => setForm((f) => ({ ...f, day_of_week: e.target.value as DayOfWeek }))}>
                  {DAYS.map((d) => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                </select>
              </div>
              <div className="space-y-2"><Label>Room</Label><Input value={form.room} onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))} placeholder="Room 101" /></div>
              <div className="space-y-2"><Label>Start</Label><Input type="time" value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>End</Label><Input type="time" value={form.end_time} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))} required /></div>
              <div className="flex items-end"><Button type="submit">Add</Button></div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {grouped.map(({ day, slots }) => (
          <Card key={day}>
            <CardHeader><CardTitle className="capitalize">{day}</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {slots.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                    <div>
                      <p className="font-medium text-sm">{s.course.title}</p>
                      <p className="text-xs text-zinc-500">{s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}{s.room ? ` · ${s.room}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{DAY_SHORT[s.day_of_week]}</Badge>
                      {user?.role === 'admin' && <Button variant="destructive" size="sm" onClick={() => void onDelete(s.id)}>Remove</Button>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
        {grouped.length === 0 && <p className="text-center text-sm text-zinc-500">No schedule entries yet.</p>}
      </div>
    </div>
  )
}
