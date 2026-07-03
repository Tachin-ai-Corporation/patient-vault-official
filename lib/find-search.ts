// Find — the query/matching primitive.
//
// NOTE (v0 mock): The scoring below runs CLIENT-SIDE over the current project's
// in-memory patients. In production this is a single endpoint:
//
//   POST /find
//   { "given_name"?, "family_name"?, "date_of_birth"?, "any"?, "exact"?: boolean }
//
// where `exact` defaults to false and EVERY result always carries a `score`
// in [0,1]. Fuzzy mode returns ranked candidates; exact mode returns only
// rows matching the provided fields, each at score 1.00.
//
// runFind() powers the INSTANT, as-you-type local filter in the patients grid.
// The real server find (GET /v3/patient/find) is wired via findPatients() in
// lib/api/patient.ts and is invoked when the user submits the Find box (Enter);
// that call flows through authFetch and therefore shows up in the API Inspector.
//
// Find is also the dedupe / patient-matching primitive: the same ranked,
// scored lookup is what powers "is this incoming record already in the vault?"

import { patientFullName, type Patient } from '@/lib/patient-data'

export type FindQuery = {
  given_name: string
  family_name: string
  date_of_birth: string
  any: string
  exact: boolean
}

export type FindResult = {
  patient: Patient
  score: number
}

export function isEmptyQuery(q: FindQuery): boolean {
  return (
    !q.given_name.trim() &&
    !q.family_name.trim() &&
    !q.date_of_birth.trim() &&
    !q.any.trim()
  )
}

function norm(s: string): string {
  return s.trim().toLowerCase()
}

// Levenshtein edit distance for light fuzzy similarity.
function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const prev = new Array(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + cost)
      diag = tmp
    }
  }
  return prev[b.length]
}

// Similarity of a single term against a target field, in [0,1].
function termScore(term: string, target: string): number {
  const t = norm(term)
  const v = norm(target)
  if (!t || !v) return 0
  if (t === v) return 1
  if (v.startsWith(t)) return 0.9
  if (v.includes(t)) return 0.75
  // token overlap (e.g. "garcia lopez" vs "lopez")
  const vTokens = v.split(/\s+/)
  if (vTokens.some((tok) => tok === t)) return 0.85
  if (vTokens.some((tok) => tok.startsWith(t))) return 0.8
  // light fuzzy: normalized edit distance over the longer string
  const dist = levenshtein(t, v)
  const sim = 1 - dist / Math.max(t.length, v.length)
  // only reward genuinely close matches
  return sim > 0.6 ? sim * 0.7 : 0
}

// Exact-field equality used in exact mode (case-insensitive for names).
function exactMatch(term: string, target: string): boolean {
  return norm(term) === norm(target)
}

export function runFind(patients: Patient[], q: FindQuery): FindResult[] {
  if (isEmptyQuery(q)) return []

  // --- exact mode: only rows matching every provided field, score 1.00 ------
  if (q.exact) {
    return patients
      .filter((p) => {
        if (q.given_name.trim() && !exactMatch(q.given_name, p.given_name))
          return false
        if (q.family_name.trim() && !exactMatch(q.family_name, p.family_name))
          return false
        if (
          q.date_of_birth.trim() &&
          norm(q.date_of_birth) !== norm(p.date_of_birth)
        )
          return false
        if (q.any.trim()) {
          const hay = `${patientFullName(p)} ${p.date_of_birth} ${p.id}`
          if (!norm(hay).includes(norm(q.any))) return false
        }
        return true
      })
      .map((patient) => ({ patient, score: 1 }))
  }

  // --- fuzzy mode: score each patient, keep meaningful matches --------------
  const results: FindResult[] = []
  for (const p of patients) {
    const parts: number[] = []
    if (q.given_name.trim()) parts.push(termScore(q.given_name, p.given_name))
    if (q.family_name.trim())
      parts.push(termScore(q.family_name, p.family_name))
    if (q.date_of_birth.trim())
      parts.push(termScore(q.date_of_birth, p.date_of_birth))
    if (q.any.trim()) {
      const anyScore = Math.max(
        termScore(q.any, patientFullName(p)),
        termScore(q.any, p.given_name),
        termScore(q.any, p.family_name),
        termScore(q.any, p.date_of_birth),
        termScore(q.any, p.id),
      )
      parts.push(anyScore)
    }
    if (parts.length === 0) continue
    const score = parts.reduce((a, b) => a + b, 0) / parts.length
    if (score >= 0.3) results.push({ patient: p, score })
  }

  return results.sort((a, b) => b.score - a.score)
}

export function formatScore(score: number): string {
  return score.toFixed(2)
}
