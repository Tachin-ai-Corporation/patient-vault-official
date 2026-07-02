'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

// A grid column descriptor. `pinned` columns can never be hidden (their toggle
// is disabled) so the grid can never be rendered completely empty.
export type GridColumn = {
  key: string
  label: string
  pinned?: boolean
}

// The fixed, built-in columns in display order. Custom fields are appended
// after these at runtime.
export const BASE_GRID_COLUMNS: GridColumn[] = [
  { key: 'name', label: 'Name', pinned: true },
  { key: 'dob', label: 'DOB' },
  { key: 'sex_at_birth', label: 'Sex at birth' },
  { key: 'gender_identity', label: 'Gender identity' },
  { key: 'id', label: 'MRN/ID' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'city_state', label: 'City/State' },
  { key: 'created', label: 'Created date' },
]

// Default-visible base columns ("Reset to default"). A curated subset so that
// "Reset to default" is meaningfully different from "Select all".
const DEFAULT_VISIBLE_BASE = new Set([
  'name',
  'dob',
  'sex_at_birth',
  'id',
  'email',
  'phone',
])

const STORAGE_KEY = 'pv:grid-column-visibility'

export function customFieldColumnKey(id: string): string {
  return `cf:${id}`
}

function loadStored(): Record<string, boolean> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : null
  } catch {
    return null
  }
}

/**
 * Manages which grid columns are visible, persisted to localStorage so the
 * choice survives reloads. `customColumns` are the dynamic, developer-defined
 * fields currently present in the grid.
 */
export function useColumnVisibility(customColumns: GridColumn[]) {
  const allColumns = useMemo(
    () => [...BASE_GRID_COLUMNS, ...customColumns],
    [customColumns],
  )

  const buildDefault = useCallback((): Record<string, boolean> => {
    const map: Record<string, boolean> = {}
    for (const c of BASE_GRID_COLUMNS) {
      map[c.key] = DEFAULT_VISIBLE_BASE.has(c.key)
    }
    // Custom fields default to visible (they were always shown before).
    for (const c of customColumns) map[c.key] = true
    map.name = true // pinned, never hidden
    return map
  }, [customColumns])

  const [visible, setVisible] = useState<Record<string, boolean>>(buildDefault)
  const [hydrated, setHydrated] = useState(false)

  // Hydrate from localStorage on mount, merging stored choices over defaults so
  // newly introduced columns (e.g. a freshly added custom field) still appear.
  useEffect(() => {
    const stored = loadStored()
    setVisible(() => {
      const merged = { ...buildDefault(), ...(stored ?? {}) }
      merged.name = true
      return merged
    })
    setHydrated(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Ensure every current column has an entry once custom fields change. New
  // custom fields default to visible.
  const customKeySignature = customColumns.map((c) => c.key).join(',')
  useEffect(() => {
    if (!hydrated) return
    setVisible((prev) => {
      let changed = false
      const next = { ...prev }
      for (const c of allColumns) {
        if (!(c.key in next)) {
          next[c.key] = true
          changed = true
        }
      }
      return changed ? next : prev
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customKeySignature, hydrated])

  // Persist whenever the selection changes (display-only; no server write).
  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(visible))
    } catch {
      // ignore quota / serialization failures — persistence is best-effort
    }
  }, [visible, hydrated])

  const toggle = useCallback((key: string) => {
    if (key === 'name') return // pinned
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const selectAll = useCallback(() => {
    const map: Record<string, boolean> = {}
    for (const c of allColumns) map[c.key] = true
    setVisible(map)
  }, [allColumns])

  const reset = useCallback(() => {
    setVisible(buildDefault())
  }, [buildDefault])

  const isVisible = useCallback(
    (key: string) => key === 'name' || !!visible[key],
    [visible],
  )

  return { allColumns, isVisible, toggle, selectAll, reset }
}
