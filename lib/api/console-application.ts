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
  launchSecretMasked?: string
}

export type ApplicationResponse = { application: ConsoleApplication | null; error?: string }
export type ApplicationCreationResponse = ApplicationResponse & { launchSecret: string }

function environment(env: ApiEnv) {
  return env === 'staging' ? 'demo' : 'production'
}

async function request<T extends ApplicationResponse = ApplicationResponse>(env: ApiEnv, init?: RequestInit): Promise<T> {
  const response = await authFetch(`/api/console/application?environment=${environment(env)}`, init)
  const body = (await response.json()) as T
  if (!response.ok) throw new Error(body.error || 'Unable to manage the Patient Vault application.')
  return body
}

export function getConsoleApplication(env: ApiEnv) {
  return request(env)
}

export function createConsoleApplication(env: ApiEnv, form: FormData) {
  return request<ApplicationCreationResponse>(env, { method: 'POST', body: form })
}

export function updateConsoleApplication(env: ApiEnv, form: FormData) {
  return request(env, { method: 'PUT', body: form })
}
