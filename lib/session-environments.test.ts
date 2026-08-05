import assert from 'node:assert/strict'
import test from 'node:test'

import {
  connectedBaseUrlFor,
  // @ts-expect-error Node's strip-types runner requires the runtime extension.
} from './session-environments.ts'

function cookieReader(values: Record<string, string>) {
  return (name: string) => values[name] ?? null
}

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
