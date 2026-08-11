import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildMergePlan,
  // @ts-expect-error Node's strip-types runner requires the runtime extension.
} from './patient-merge.ts'

test('builds canonical redirects and defaults field sources', () => {
  const plan = buildMergePlan(['a', 'b', 'c'], 'b')
  assert.deepEqual(plan.mergedIds, ['a', 'c'])
  assert.deepEqual(plan.redirects, [
    { from: 'a', to: 'b', status: 308 },
    { from: 'c', to: 'b', status: 308 },
  ])
  assert.equal(plan.fieldSources.given_name, 'b')
})

test('keeps field-level survivor choices separate from canonical identity', () => {
  const plan = buildMergePlan(['a', 'b'], 'a', { family_name: 'b' })
  assert.equal(plan.canonicalId, 'a')
  assert.equal(plan.fieldSources.family_name, 'b')
  assert.equal(plan.fieldSources.date_of_birth, 'a')
})

test('requires two or three selected patients', () => {
  assert.throws(() => buildMergePlan(['a'], 'a'))
  assert.throws(() => buildMergePlan(['a', 'b', 'c', 'd'], 'a'))
})
