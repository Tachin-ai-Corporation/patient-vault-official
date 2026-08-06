import assert from 'node:assert/strict'
import test from 'node:test'

import {
  connectedBaseUrlFor,
  ENVIRONMENT_CONFIG,
  // @ts-expect-error Node's strip-types runner requires the runtime extension.
} from './session-environments.ts'
import {
  ENVIRONMENTS,
  environmentId,
  environmentLabel,
  keyPrefixFor,
  // @ts-expect-error Node's strip-types runner requires the runtime extension.
} from './environments.ts'

function cookieReader(values: Record<string, string>) {
  return (name: string) => values[name] ?? null
}

test('Sandbox display label preserves staging compatibility contracts', () => {
  const sandbox = ENVIRONMENTS.find((environment) => environment.id === 'staging')
  assert.ok(sandbox)
  assert.equal(environmentId(sandbox), 'staging')
  assert.equal(environmentLabel('staging'), 'Sandbox')
  assert.equal(keyPrefixFor('staging'), 'pv_sk_test_')
  assert.equal(ENVIRONMENT_CONFIG.demo.ui, 'staging')
  assert.equal(ENVIRONMENT_CONFIG.demo.label, 'Sandbox')
})

test('hosted login URLs use the Patient Vault tenant', () => {
  assert.equal(
    ENVIRONMENT_CONFIG.demo.loginUrl,
    'https://pv.demo.1health.io/login?openApp=Patient%20Vault',
  )
  assert.equal(
    ENVIRONMENT_CONFIG.prod.loginUrl,
    'https://1health.app.1health.io/login?openApp=Patient%20Vault',
  )
})

test('connected base URL comes from the launched session, not UI environment state', () => {
  const readCookie = cookieReader({
    active_environment: 'demo',
    onehealth_base_url: 'https://stale-ui-derived.example.test',
    demo_base_url: 'https://launch-connected.staging.example.test/',
    prod_base_url: 'https://launch-connected.production.example.test',
  })

  assert.equal(
    connectedBaseUrlFor('demo', readCookie),
    'https://launch-connected.staging.example.test',
  )
  assert.equal(
    connectedBaseUrlFor('prod', readCookie),
    'https://launch-connected.production.example.test',
  )
})

test('legacy onehealth_base_url is used only for its active session', () => {
  const readCookie = cookieReader({
    active_environment: 'prod',
    onehealth_base_url: 'https://launch-connected.production.example.test/',
  })

  assert.equal(
    connectedBaseUrlFor('prod', readCookie),
    'https://launch-connected.production.example.test',
  )
  assert.equal(connectedBaseUrlFor('demo', readCookie), null)
})
