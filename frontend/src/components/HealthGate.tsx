import { useEffect, useState, type ReactNode } from 'react'
import { checkHealth } from '@/api/client'
import type { HealthResponse } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function HealthGate({ children }: { children: ReactNode }) {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [rechecking, setRechecking] = useState(false)

  const load = async () => {
    setRechecking(true)
    try {
      const h = await checkHealth()
      setHealth(h)
    } catch {
      setHealth({ status: 'error', database: 'disconnected' })
    } finally {
      setRechecking(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  if (!health) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-sm text-zinc-500">Checking services…</p>
      </div>
    )
  }

  if (health.database !== 'connected') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Service unavailable</CardTitle>
            <CardDescription>
              The application cannot reach the database. This is usually temporary—confirm PostgreSQL is running and
              the API container is healthy, then try again.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Status: <span className="font-medium text-zinc-900 dark:text-zinc-100">{health.status}</span>
              <br />
              Database:{' '}
              <span className="font-medium text-red-600 dark:text-red-400">{health.database}</span>
            </p>
            <Button type="button" onClick={() => void load()} disabled={rechecking}>
              {rechecking ? 'Checking…' : 'Retry connection'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
