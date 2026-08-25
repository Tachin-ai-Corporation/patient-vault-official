import assert from 'node:assert/strict'
import test from 'node:test'
// @ts-expect-error Node's strip-types runner requires the runtime extension.
import { validateLoginIntent } from './login-intent.ts'

test('accepts same-origin application paths with query strings', () => {
  assert.equal(validateLoginIntent('/documentation?resource=find'), '/documentation?resource=find')
  assert.equal(validateLoginIntent('/patients'), '/patients')
  assert.equal(
    validateLoginIntent('/patients/91563114?tab=documents&type=clinical_note'),
    '/patients/91563114?tab=documents&type=clinical_note',
  )
})

test('rejects external, protocol-relative, and callback targets', () => {
  assert.equal(validateLoginIntent('https://evil.example/console'), null)
  assert.equal(validateLoginIntent('//evil.example/console'), null)
  assert.equal(validateLoginIntent('/auth?lpl=secret'), null)
  assert.equal(validateLoginIntent('/api/token'), null)
})
