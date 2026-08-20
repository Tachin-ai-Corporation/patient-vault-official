'use client'

import { authFetch } from '@/lib/auth-client'
import type { ApiEnv } from '@/lib/session-context'

export type ConsoleApplication = {
  id: number
  name: string
  url: string
  description?: string
  state?: string
  iconUrl?: string
}

type ApplicationResponse = { application: ConsoleApplication | null; error?: string }

function environment(env: ApiEnv) {
  return env === 'staging' ? 'demo' : 'production'
}

async function request(env: ApiEnv, init?: RequestInit): Promise<ApplicationResponse> {
  const response = await authFetch(`/api/console/application?environment=${environment(env)}`, init)
  const body = (await response.json()) as ApplicationResponse
  if (!response.ok) throw new Error(body.error || 'Unable to manage the Patient Vault application.')
  return body
}

export function getConsoleApplication(env: ApiEnv) {
  return request(env)
}

export function createConsoleApplication(env: ApiEnv, form: FormData) {
  return request(env, { method: 'POST', body: form })
}

export function updateConsoleApplication(env: ApiEnv, form: FormData) {
  return request(env, { method: 'PUT', body: form })
}
