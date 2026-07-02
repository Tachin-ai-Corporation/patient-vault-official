'use client'

import { patientFullName, prettifyCode, type Patient } from '@/lib/patient-data'
import { BASE_GRID_COLUMNS, type GridColumn } from '@/lib/grid-columns'

type PatientsGridProps = {
  patients: Patient[]
  onSelect: (patient: Patient) => void
  loading?: boolean
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
  isVisible,
}: PatientsGridProps) {
  const visibleColumns = BASE_GRID_COLUMNS.filter(
    (c) => !isVisible || isVisible(c.key),
  )
  const columnCount = visibleColumns.length

  return (
    <div className="overflow-hidden rounded-card border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-xs">
              {visibleColumns.map((c) => (
                <HeaderCell
                  key={c.key}
                  className={c.key === 'id' ? 'font-mono' : undefined}
                >
                  {c.label}
                </HeaderCell>
              ))}
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
                    {visibleColumns.map((c) => (
                      <td key={c.key} className="h-12 px-4">
                        {renderCell(c, p)}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
