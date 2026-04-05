import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { HealthGate } from '@/components/HealthGate'
import { AppShell } from '@/components/layout/AppShell'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { RequireAdmin } from '@/components/RequireAdmin'
import { AnnouncementsPage } from '@/pages/AnnouncementsPage'
import { AttendancePage } from '@/pages/AttendancePage'
import { CoursesPage } from '@/pages/CoursesPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { EnrollmentsPage } from '@/pages/EnrollmentsPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { GradesPage } from '@/pages/GradesPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'
import { SchedulePage } from '@/pages/SchedulePage'
import { StudentsPage } from '@/pages/StudentsPage'
import { UsersPage } from '@/pages/UsersPage'

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <HealthGate>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AppShell />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="students" element={<StudentsPage />} />
                  <Route path="courses" element={<CoursesPage />} />
                  <Route path="grades" element={<GradesPage />} />
                  <Route path="attendance" element={<AttendancePage />} />
                  <Route path="announcements" element={<AnnouncementsPage />} />
                  <Route path="schedule" element={<SchedulePage />} />
                  <Route element={<RequireAdmin />}>
                    <Route path="enrollments" element={<EnrollmentsPage />} />
                    <Route path="users" element={<UsersPage />} />
                  </Route>
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </HealthGate>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
