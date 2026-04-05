import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  UserCog,
  Users,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import type { UserRole } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; roles: UserRole[] }

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'teacher', 'student'] },
  { to: '/students', label: 'Students', icon: Users, roles: ['admin', 'teacher', 'student'] },
  { to: '/courses', label: 'Courses', icon: BookOpen, roles: ['admin', 'teacher', 'student'] },
  { to: '/enrollments', label: 'Enrollments', icon: GraduationCap, roles: ['admin'] },
  { to: '/grades', label: 'Grades', icon: GraduationCap, roles: ['admin', 'teacher', 'student'] },
  { to: '/users', label: 'Users', icon: UserCog, roles: ['admin'] },
]

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth()
  if (!user) return null
  const filtered = navItems.filter((item) => item.roles.includes(user.role))
  return (
    <nav className="flex flex-col gap-1">
      {filtered.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800',
            )
          }
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

export function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="hidden w-60 shrink-0 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 md:flex md:flex-col">
        <div className="flex h-14 items-center border-b border-zinc-200 px-4 dark:border-zinc-800">
          <Link to="/" className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Student MS
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <NavLinks />
        </div>
        <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
          <div className="mb-2 truncate text-xs text-zinc-500">
            <div className="font-medium text-zinc-900 dark:text-zinc-100">{user?.full_name}</div>
            <div>{user?.email}</div>
            <div className="capitalize">{user?.role}</div>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            type="button"
            onClick={() => {
              void logout().then(() => navigate('/login'))
            }}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-950 md:hidden">
          <span className="font-semibold">Student MS</span>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" type="button" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="left-4 top-4 max-h-[90vh] max-w-[calc(100%-2rem)] translate-x-0 translate-y-0 overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Menu</DialogTitle>
              </DialogHeader>
              <NavLinks onNavigate={() => setOpen(false)} />
              <Button
                variant="outline"
                className="mt-4 w-full"
                type="button"
                onClick={() => {
                  setOpen(false)
                  void logout().then(() => navigate('/login'))
                }}
              >
                Sign out
              </Button>
            </DialogContent>
          </Dialog>
        </header>

        <main className="flex-1 overflow-auto bg-zinc-50 p-4 dark:bg-zinc-950 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
