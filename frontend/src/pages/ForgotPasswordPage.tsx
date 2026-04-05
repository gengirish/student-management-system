import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setMessage('')
    try {
      const result = await forgotPassword(email)
      setMessage(result.message)
      if (result.reset_token) setResetToken(result.reset_token)
    } catch {
      setMessage('Something went wrong. Try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Forgot password</CardTitle>
          <CardDescription>Enter your email to get a password reset link.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4">
            {message && <p className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-200">{message}</p>}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>{pending ? 'Sending…' : 'Send reset link'}</Button>
            {resetToken && (
              <div className="space-y-2">
                <p className="text-sm text-zinc-500">Use this link to reset your password:</p>
                <Link to={`/reset-password?token=${resetToken}`} className="break-all text-sm font-medium text-blue-600 underline dark:text-blue-400">
                  Reset password link
                </Link>
              </div>
            )}
            <p className="text-center text-sm text-zinc-500">
              <Link to="/login" className="font-medium text-zinc-900 underline dark:text-zinc-100">Back to sign in</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
