import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  fetchMe,
  loginRequest,
  logoutRequest,
  registerRequest,
} from '@/api/client'
import type { User } from '@/api/types'

type AuthContextValue = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: {
    email: string
    password: string
    full_name: string
    student_id: string
    grade_year: number
  }) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setUser(null)
      return
    }
    try {
      const me = await fetchMe()
      setUser(me)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    void (async () => {
      setLoading(true)
      await refreshUser()
      setLoading(false)
    })()
  }, [refreshUser])

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await loginRequest(email, password)
    localStorage.setItem('access_token', tokens.access_token)
    localStorage.setItem('refresh_token', tokens.refresh_token)
    const me = await fetchMe()
    setUser(me)
  }, [])

  const register = useCallback(
    async (data: {
      email: string
      password: string
      full_name: string
      student_id: string
      grade_year: number
    }) => {
      const tokens = await registerRequest(data)
      localStorage.setItem('access_token', tokens.access_token)
      localStorage.setItem('refresh_token', tokens.refresh_token)
      const me = await fetchMe()
      setUser(me)
    },
    [],
  )

  const logout = useCallback(async () => {
    await logoutRequest()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refreshUser }),
    [user, loading, login, register, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
