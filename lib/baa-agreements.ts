export type BaaAgreement = {
  id: number
  accepted: boolean
}

export type BaaStatus = {
  accepted: boolean
  pendingIds: number[]
}

export function normalizeBaaAgreements(value: unknown): BaaStatus | null {
  if (!Array.isArray(value) || value.length === 0) return null

  const agreements: BaaAgreement[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') return null
    const record = item as Record<string, unknown>
    const state = record.state
    if (
      typeof record.id !== 'number' ||
      !Number.isInteger(record.id) ||
      record.id <= 0 ||
      !state ||
      typeof state !== 'object' ||
      typeof (state as Record<string, unknown>).accepted !== 'boolean'
    ) {
      return null
    }
    agreements.push({
      id: record.id,
      accepted: (state as Record<string, unknown>).accepted as boolean,
    })
  }

  const pendingIds = agreements.filter((agreement) => !agreement.accepted).map(({ id }) => id)
  return { accepted: pendingIds.length === 0, pendingIds }
}

export type BaaEntityType = 'covered' | 'non-covered'

export function isHipaaCoveredEntity(entityType: BaaEntityType): boolean {
  return entityType === 'covered'
}

export function acceptanceBody(ids: number[]): { ids: number[] } {
  return { ids }
}
