'use client'

import { patientFullName, prettifyCode, type Patient } from '@/lib/patient-data'
import { BASE_GRID_COLUMNS, type GridColumn } from '@/lib/grid-columns'

export type PatientFindMeta = {
  score: number
  matchedOn: string[]
}

type PatientsGridProps = {
  patients: Patient[]
  onSelect: (patient: Patient) => void
  loading?: boolean
  findMeta?: ReadonlyMap<string, PatientFindMeta>
  selectedIds?: ReadonlySet<string>
  onToggleSelected?: (patient: Patient) => void
  selectionLimit?: number
  // Returns whether a column key should be rendered. Defaults to all-visible.
  isVisible?: (key: string) => boolean
}

function HeaderCell({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-2.5 text-left font-medium text-muted-foreground ${className ?? ''}`}
    >
      {children}
    </th>
  )
}

function emailValue(p: Patient): string | null {
  return p.contacts.find((c) => c.type === 'email')?.value ?? null
}

function phoneValue(p: Patient): string | null {
  const phone = p.contacts.find(
    (c) => c.type === 'mobile' || c.type === 'home' || c.type === 'work',
  )
  return phone?.value ?? null
}

function cityState(p: Patient): string | null {
  const a = p.addresses[0]
  if (!a) return null
  return [a.city, a.state].filter(Boolean).join(', ') || null
}

function formatCreated(iso?: string): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const EmDash = () => <span className="text-muted-foreground">—</span>

// Render a single cell's content for a given column + patient.
function renderCell(col: GridColumn, p: Patient) {
  switch (col.key) {
    case 'name':
      return (
        <span className="font-medium text-foreground">
          {patientFullName(p)}
        </span>
      )
    case 'dob':
      return (
        <span className="font-mono text-[13px] text-muted-foreground">
          {p.date_of_birth}
        </span>
      )
    case 'sex_at_birth':
      return (
        <span className="text-muted-foreground">
          {prettifyCode(p.sex_at_birth)}
        </span>
      )
    case 'gender_identity':
      return (
        <span className="text-muted-foreground">
          {p.gender_identity || <EmDash />}
        </span>
      )
    case 'id':
      return <span className="font-mono text-[13px] text-accent">{p.id}</span>
    case 'email': {
      const v = emailValue(p)
      return v ? (
        <span className="font-mono text-[13px] text-muted-foreground">{v}</span>
      ) : (
        <EmDash />
      )
    }
    case 'phone': {
      const v = phoneValue(p)
      return v ? (
        <span className="font-mono text-[13px] text-muted-foreground">{v}</span>
      ) : (
        <EmDash />
      )
    }
    case 'city_state': {
      const v = cityState(p)
      return v ? <span className="text-muted-foreground">{v}</span> : <EmDash />
    }
    case 'created': {
      const v = formatCreated(p.created_at)
      return v ? (
        <span className="font-mono text-[13px] text-muted-foreground">{v}</span>
      ) : (
        <EmDash />
      )
    }
    default:
      return <EmDash />
  }
}

export function PatientsGrid({
  patients,
  onSelect,
  loading,
  findMeta,
  selectedIds,
  onToggleSelected,
  selectionLimit = 3,
  isVisible,
}: PatientsGridProps) {
  const visibleColumns = BASE_GRID_COLUMNS.filter(
    (c) => !isVisible || isVisible(c.key),
  )
  const selection = findMeta && selectedIds && onToggleSelected
    ? { selectedIds, onToggleSelected }
    : null
  const selectable = selection !== null
  const columnCount = visibleColumns.length + (findMeta ? 2 : 0) + (selectable ? 1 : 0)

  return (
    <div className="overflow-hidden rounded-card border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-xs">
              {selectable && <HeaderCell><span className="sr-only">Select for merge</span></HeaderCell>}
              {visibleColumns.map((c) => (
                <HeaderCell
                  key={c.key}
                  className={c.key === 'id' ? 'font-mono' : undefined}
                >
                  {c.label}
                </HeaderCell>
              ))}
              {findMeta && (
                <>
                  <HeaderCell className="font-mono">Score</HeaderCell>
                  <HeaderCell>Matched on</HeaderCell>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    {Array.from({ length: columnCount }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3.5 w-full max-w-[120px] animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              : patients.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => onSelect(p)}
                    tabIndex={0}
                    role="button"
                    aria-label={`Open ${patientFullName(p)}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onSelect(p)
                      }
                    }}
                    className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/50 focus-visible:bg-muted/50"
                  >
                    {selectable && (() => {
                      const checked = selection.selectedIds.has(p.id)
                      const disabled = !checked && selection.selectedIds.size >= selectionLimit
                      const limitMessage = `You can compare up to ${selectionLimit} patients.`
                      return (
                        <td className="h-12 px-4" onClick={(event) => event.stopPropagation()}>
                          <span className="inline-flex" title={disabled ? limitMessage : undefined}>
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={disabled}
                              aria-label={disabled ? `${patientFullName(p)} unavailable. ${limitMessage}` : `Select ${patientFullName(p)} for merge review`}
                              onChange={() => selection.onToggleSelected(p)}
                              className="h-4 w-4 rounded border-border accent-primary disabled:cursor-not-allowed"
                            />
                          </span>
                        </td>
                      )
                    })()}
                    {visibleColumns.map((c) => (
                      <td key={c.key} className="h-12 px-4">
                        {renderCell(c, p)}
                      </td>
                    ))}
                    {findMeta && (
                      <>
                        <td className="h-12 px-4 font-mono text-[13px] tabular-nums text-foreground">
                          {findMeta.get(p.id)?.score.toFixed(2) ?? '—'}
                        </td>
                        <td className="h-12 px-4">
                          <div className="flex flex-wrap gap-1">
                            {(findMeta.get(p.id)?.matchedOn ?? []).map((field) => (
                              <span
                                key={field}
                                className="rounded-full border border-border bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground"
                              >
                                {field}
                              </span>
                            ))}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
