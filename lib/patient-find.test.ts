import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildPatientFindPath,
  hasPatientFindCriteria,
  patientFindPreview,
  // @ts-expect-error Node's strip-types runner requires the runtime extension.
} from './patient-find.ts'

test('builds only documented find parameters in canonical order', () => {
  const criteria = {
    firstName: ' Ada ',
    lastName: 'Lovelace',
    dob: '1815-12-10',
    sexAtBirth: 'female',
    exact: true,
  }
  assert.equal(
    buildPatientFindPath(criteria),
    '/v3/patient/find?firstName=Ada&lastName=Lovelace&dob=1815-12-10&sexAtBirth=female&exact=true',
  )
  assert.equal(
    patientFindPreview(criteria),
    'GET /api/v3/patient/find?firstName=Ada&lastName=Lovelace&dob=1815-12-10&sexAtBirth=female&exact=true',
  )
})

test('always includes exact and requires one demographic criterion', () => {
  const empty = { firstName: '', lastName: '', dob: '', sexAtBirth: '', exact: false }
  assert.equal(buildPatientFindPath(empty), '/v3/patient/find?exact=false')
  assert.equal(hasPatientFindCriteria(empty), false)
  assert.equal(hasPatientFindCriteria({ ...empty, lastName: 'Ng' }), true)
})
