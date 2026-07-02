'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/session-context'
import { Field, TextInput } from '@/components/ui/field'
import { Button } from '@/components/ui/button'

export function LoginForm() {
  const router = useRouter()
  const { login } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    // MOCK auth — accept any non-empty email + password. No password rules.
    // SWAP POINT: real implementation authenticates via OAuth 2.1 / session.
    if (!email.trim() || !password.trim()) {
      setError('Enter an email and password to continue.')
      return
    }
    login()
    router.replace('/patients')
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4" noValidate>
      <Field label="Email" htmlFor="login-email">
        <TextInput
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="you@yourcompany.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setError(null)
          }}
        />
      </Field>

      <Field label="Password" htmlFor="login-password">
        <TextInput
          id="login-password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            setError(null)
          }}
        />
      </Field>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Button type="submit" size="lg" className="mt-1 w-full">
        Log in
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        New here?{' '}
        <Link
          href="/register"
          className="font-medium text-accent underline-offset-4 hover:underline"
        >
          Register
        </Link>
      </p>
    </form>
  )
}
