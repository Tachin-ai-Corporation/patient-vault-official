import type { ApiEnv } from '@/lib/session-context'

/**
 * Mocked environment catalog for the console's environment selector.
 *
 * The real 1health API surface used by this app (myself + tenant + patients)
 * has no environment-provisioning endpoints, so the available environments and
 * their provisioning state are represented here as local mock data.
 *
 * Replace `ENVIRONMENTS` with a fetch when a provisioning endpoint exists; the
 * selector only depends on this shape.
 */

/**
 * Provisioning state of an environment:
 *  - `none`      — never set up; the developer must go through go-live first.
 *  - `pending`   — activation requested and awaiting review.
 *  - `active`    — fully provisioned and selectable.
 *  - `suspended` — previously active, access currently revoked.
 *
 * Only `active` environments are selectable.
 */
export type EnvironmentStatus = 'none' | 'pending' | 'active' | 'suspended'

export type EnvironmentRecord = {
  /** Display name. Lowercased, this is the environment's `ApiEnv` id. */
  name: string
  status: EnvironmentStatus
  /** Prefix on API keys issued for this environment. */
  keyPrefix: string
}

/**
 * Staging is always `active` — every account gets a working sandbox, so it is
 * the safe default the console falls back to.
 */
export const ENVIRONMENTS: EnvironmentRecord[] = [
  { name: 'Staging', status: 'active', keyPrefix: 'pv_stg' },
  { name: 'Production', status: 'none', keyPrefix: 'pv_live' },
]

/** `{ name: 'Staging' }` -> `'staging'`, the id held in session state. */
export function environmentId(env: EnvironmentRecord): ApiEnv {
  return env.name.toLowerCase() as ApiEnv
}

export function findEnvironment(id: ApiEnv): EnvironmentRecord | undefined {
  return ENVIRONMENTS.find((env) => environmentId(env) === id)
}

/** Only fully-provisioned environments can be switched into. */
export function isSelectable(env: EnvironmentRecord): boolean {
  return env.status === 'active'
}
