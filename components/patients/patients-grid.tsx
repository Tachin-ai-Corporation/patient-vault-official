'use client'

import { patientFullName, type Patient } from '@/lib/patient-data'
import {
  formatCustomValue,
  useCustomFields,
  type CustomFieldDef,
} from '@/lib/custom-fields-context'
import {
  BASE_GRID_COLUMNS,
  customFieldColumnKey,
  type GridColumn,
} from '@/lib/grid-columns'

type PatientsGridProps = {
  patients: Patient[]
  onSelect: (patient: Patient) => void
  loading?: boolean
  // Returns whether a column key should be rendered. Defaults to all-visible
  // when not provided (e.g. during the seeding stream).
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

function firstContact(p: Patient, system: 'email' | 'phone'): string | null {
  return p.contacts.find((c) => c.system === system)?.value ?? null
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
function renderCell(
  col: GridColumn & { field?: CustomFieldDef },
  p: Patient,
  getValues: (id: string) => Record<string, string>,
) {
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
      return <span className="text-muted-foreground">{p.sex_at_birth}</span>
    case 'gender_identity':
      return (
        <span className="text-muted-foreground">
          {p.gender_identity || <EmDash />}
        </span>
      )
    case 'id':
      return <span className="font-mono text-[13px] text-accent">{p.id}</span>
    case 'email': {
      const v = firstContact(p, 'email')
      return v ? (
        <span className="font-mono text-[13px] text-muted-foreground">{v}</span>
      ) : (
        <EmDash />
      )
    }
    case 'phone': {
      const v = firstContact(p, 'phone')
      return v ? (
        <span className="font-mono text-[13px] text-muted-foreground">{v}</span>
      ) : (
        <EmDash />
      )
    }
    case 'city_state': {
      const v = cityState(p)
      return v ? (
        <span className="text-muted-foreground">{v}</span>
      ) : (
        <EmDash />
      )
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
      // Custom field column.
      if (col.field) {
        return (
          <span className="text-muted-foreground">
            {formatCustomValue(col.field.type, getValues(p.id)[col.field.id])}
          </span>
        )
      }
      return <EmDash />
  }
}

export function PatientsGrid({
  patients,
  onSelect,
  loading,
  isVisible,
}: PatientsGridProps) {
  const { fields, getValues } = useCustomFields()

  // Build the full ordered column list: fixed base columns then custom fields.
  const customColumns: (GridColumn & { field: CustomFieldDef })[] = fields.map(
    (f) => ({ key: customFieldColumnKey(f.id), label: f.name, field: f }),
  )
  const allColumns: (GridColumn & { field?: CustomFieldDef })[] = [
    ...BASE_GRID_COLUMNS,
    ...customColumns,
  ]
  const visibleColumns = allColumns.filter(
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
                        {renderCell(c, p, getValues)}
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
