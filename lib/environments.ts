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
  /** Stable compatibility identifier used by sessions and APIs. */
  id: ApiEnv
  /** User-facing display name. */
  name: string
  status: EnvironmentStatus
  /**
   * Prefix on secret API keys issued for this environment, including the
   * trailing underscore so it can be concatenated directly with a key body.
   * This is the single source of truth for key prefixes — surfaces should read
   * it from here rather than hardcoding their own.
   */
  keyPrefix: string
}

/**
 * Sandbox retains the stable `staging` id used by sessions and APIs. It is
 * always active, so it remains the console's safe default environment.
 */
export const ENVIRONMENTS: EnvironmentRecord[] = [
  { id: 'staging', name: 'Sandbox', status: 'active', keyPrefix: 'pv_sk_test_' },
  { id: 'production', name: 'Production', status: 'none', keyPrefix: 'pv_sk_live_' },
]

/** Returns the stable compatibility id held in session state. */
export function environmentId(env: EnvironmentRecord): ApiEnv {
  return env.id
}

export function findEnvironment(id: ApiEnv): EnvironmentRecord | undefined {
  return ENVIRONMENTS.find((env) => env.id === id)
}

/** Returns the user-facing name for an internal environment id. */
export function environmentLabel(id: ApiEnv): string {
  return findEnvironment(id)?.name ?? (id === 'production' ? 'Production' : 'Sandbox')
}

/**
 * Key prefix for an environment id, e.g. `'staging'` -> `'pv_sk_test_'`.
 *
 * Falls back to the staging prefix for an unknown id: if the catalog and the
 * session state ever disagree, showing a test-key prefix is the safe failure
 * mode, since it cannot imply a live-data credential.
 */
export function keyPrefixFor(id: ApiEnv): string {
  return findEnvironment(id)?.keyPrefix ?? 'pv_sk_test_'
}

/** Only fully-provisioned environments can be switched into. */
export function isSelectable(env: EnvironmentRecord): boolean {
  return env.status === 'active'
}
