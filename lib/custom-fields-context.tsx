'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

// ---- Custom field model (UI-only / MOCK) -----------------------------------
// The custom field manager lets a developer extend the Patients schema with
// their own attributes. Each definition is a (name + type) that is assigned the
// next free typed "slot" — a subtle technical detail mirroring how a fixed-
// column vault would physically store the value (T1..T20 for text, etc.).
//
// This is intentionally CLIENT-SIDE: definitions and values are persisted to
// localStorage so they survive reload, but there is no server. SWAP POINT: in
// production, schema changes are a versioned migration against the vault and
// values are stored on the patient record server-side.

// Seven field types are offered. Scalars map to a typed slot namespace; `file`
// is modeled as an attachment reference with its own F-series slots.
export type CustomFieldType =
  | 'integer'
  | 'decimal'
  | 'text'
  | 'date'
  | 'timestamp'
  | 'json'
  | 'file'

// Per-type configuration: display label, slot prefix, and how many slots exist.
// Scalars get 20 slots each; JSON gets 3.
export const CUSTOM_FIELD_TYPES: {
  type: CustomFieldType
  label: string
  prefix: string
  max: number
  hint: string
}[] = [
  {
    type: 'integer',
    label: 'Integer',
    prefix: 'I',
    max: 20,
    hint: 'Whole number, no decimals (e.g. 72)',
  },
  {
    type: 'decimal',
    label: 'Decimal',
    prefix: 'D',
    max: 20,
    hint: 'Number with decimals (e.g. 98.6)',
  },
  {
    type: 'text',
    label: 'Text',
    prefix: 'T',
    max: 20,
    hint: 'Free-form text',
  },
  {
    type: 'date',
    label: 'Date',
    prefix: 'DATE',
    max: 20,
    hint: 'Calendar date, no time — timezone-unaware (e.g. 2026-06-26)',
  },
  {
    type: 'timestamp',
    label: 'Timestamp',
    prefix: 'TS',
    max: 20,
    hint: 'Date and time — timezone-aware (e.g. 2026-06-26 14:30)',
  },
  {
    type: 'json',
    label: 'JSON',
    prefix: 'J',
    max: 3,
    hint: 'Structured JSON document, with an optional schema',
  },
  {
    type: 'file',
    label: 'File / Image',
    prefix: 'F',
    max: 20,
    hint: 'An uploaded image or document — stored as an attachment reference (F-series slot), not a typed value',
  },
]

const TYPE_CONFIG: Record<
  CustomFieldType,
  { label: string; prefix: string; max: number }
> = Object.fromEntries(
  CUSTOM_FIELD_TYPES.map((t) => [
    t.type,
    { label: t.label, prefix: t.prefix, max: t.max },
  ]),
) as Record<CustomFieldType, { label: string; prefix: string; max: number }>

export const MAX_FIELD_NAME_LENGTH = 24

export type CustomFieldDef = {
  id: string
  name: string
  type: CustomFieldType
  // Stable assigned slot index (1-based) and its rendered label (e.g. "T1").
  slotIndex: number
  slot: string
  // Optional JSON Schema (raw text) — only meaningful for JSON-type fields.
  schema?: string
}

// Per-patient custom values, keyed by patient id then field id. Values are kept
// as strings (the raw input value) — adequate for a mock surface.
export type CustomFieldValues = Record<string, Record<string, string>>

export function customFieldTypeLabel(type: CustomFieldType): string {
  return TYPE_CONFIG[type]?.label ?? type
}

export function slotLabel(type: CustomFieldType, index: number): string {
  return `${TYPE_CONFIG[type]?.prefix ?? '?'}${index}`
}

export function maxSlotsForType(type: CustomFieldType): number {
  return TYPE_CONFIG[type]?.max ?? 0
}

// Result of a definition mutation so the UI can surface a clear message.
export type FieldMutationResult =
  | { ok: true; def: CustomFieldDef }
  | { ok: false; error: string }

type CustomFieldsContextValue = {
  fields: CustomFieldDef[]
  // Add a field. Auto-assigns the next free slot for its type, enforcing the
  // name length, uniqueness, slot, and (for JSON) schema-validity rules.
  addField: (
    name: string,
    type: CustomFieldType,
    schema?: string,
  ) => FieldMutationResult
  // Rename an existing field (slot/type unchanged).
  renameField: (id: string, name: string) => FieldMutationResult
  // Remove a field definition, drop its stored values, and free its slot.
  removeField: (id: string) => void
  // Number of free slots remaining for a type.
  slotsRemaining: (type: CustomFieldType) => number
  // All values keyed by patient id.
  values: CustomFieldValues
  getValues: (patientId: string) => Record<string, string>
  setValue: (patientId: string, fieldId: string, value: string) => void
  setValuesForPatient: (
    patientId: string,
    next: Record<string, string>,
  ) => void
}

const CustomFieldsContext = createContext<CustomFieldsContextValue | null>(null)

let fieldSeq = 0
function generateFieldId(): string {
  fieldSeq += 1
  return `cf_${Date.now().toString(36)}_${fieldSeq}`
}

// Lowest free 1-based slot index for a type given the fields already defined.
// Returns null when the type's slots are exhausted.
function nextSlotIndex(
  fields: CustomFieldDef[],
  type: CustomFieldType,
): number | null {
  const used = new Set(
    fields.filter((f) => f.type === type).map((f) => f.slotIndex),
  )
  const max = maxSlotsForType(type)
  for (let i = 1; i <= max; i++) {
    if (!used.has(i)) return i
  }
  return null
}

const DEFS_KEY = 'pv:custom-field-defs'
const VALUES_KEY = 'pv:custom-field-values'

function loadJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function CustomFieldsProvider({ children }: { children: ReactNode }) {
  const [fields, setFields] = useState<CustomFieldDef[]>([])
  const [values, setValues] = useState<CustomFieldValues>({})
  const [hydrated, setHydrated] = useState(false)

  // Hydrate from localStorage on mount (client-only) to avoid SSR mismatch.
  useEffect(() => {
    const storedDefs = loadJson<CustomFieldDef[]>(DEFS_KEY)
    const storedValues = loadJson<CustomFieldValues>(VALUES_KEY)
    if (Array.isArray(storedDefs)) setFields(storedDefs)
    if (storedValues && typeof storedValues === 'object')
      setValues(storedValues)
    setHydrated(true)
  }, [])

  // Persist definitions and values whenever they change (best-effort).
  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return
    try {
      window.localStorage.setItem(DEFS_KEY, JSON.stringify(fields))
    } catch {
      // ignore quota / serialization failures
    }
  }, [fields, hydrated])

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return
    try {
      window.localStorage.setItem(VALUES_KEY, JSON.stringify(values))
    } catch {
      // ignore quota / serialization failures
    }
  }, [values, hydrated])

  const addField = useCallback(
    (name: string, type: CustomFieldType, schema?: string): FieldMutationResult => {
      const trimmed = name.trim()
      if (!trimmed) return { ok: false, error: 'Field name is required.' }
      if (trimmed.length > MAX_FIELD_NAME_LENGTH)
        return {
          ok: false,
          error: `Field name must be ${MAX_FIELD_NAME_LENGTH} characters or fewer.`,
        }

      // Validate an optional JSON schema up front.
      const cleanSchema = schema?.trim()
      if (type === 'json' && cleanSchema) {
        try {
          JSON.parse(cleanSchema)
        } catch {
          return { ok: false, error: 'Schema must be valid JSON.' }
        }
      }

      let result: FieldMutationResult = {
        ok: false,
        error: 'Unable to add field.',
      }
      setFields((prev) => {
        if (
          prev.some((f) => f.name.toLowerCase() === trimmed.toLowerCase())
        ) {
          result = { ok: false, error: 'A field with this name already exists.' }
          return prev
        }
        const idx = nextSlotIndex(prev, type)
        if (idx === null) {
          result = {
            ok: false,
            error: `No ${customFieldTypeLabel(type)} slots remaining.`,
          }
          return prev
        }
        const def: CustomFieldDef = {
          id: generateFieldId(),
          name: trimmed,
          type,
          slotIndex: idx,
          slot: slotLabel(type, idx),
          ...(type === 'json' && cleanSchema ? { schema: cleanSchema } : {}),
        }
        result = { ok: true, def }
        return [...prev, def]
      })
      return result
    },
    [],
  )

  const renameField = useCallback(
    (id: string, name: string): FieldMutationResult => {
      const trimmed = name.trim()
      if (!trimmed) return { ok: false, error: 'Field name is required.' }
      if (trimmed.length > MAX_FIELD_NAME_LENGTH)
        return {
          ok: false,
          error: `Field name must be ${MAX_FIELD_NAME_LENGTH} characters or fewer.`,
        }
      let result: FieldMutationResult = {
        ok: false,
        error: 'Unable to rename field.',
      }
      setFields((prev) => {
        if (
          prev.some(
            (f) =>
              f.id !== id &&
              f.name.toLowerCase() === trimmed.toLowerCase(),
          )
        ) {
          result = { ok: false, error: 'A field with this name already exists.' }
          return prev
        }
        const target = prev.find((f) => f.id === id)
        if (!target) return prev
        const updated = { ...target, name: trimmed }
        result = { ok: true, def: updated }
        return prev.map((f) => (f.id === id ? updated : f))
      })
      return result
    },
    [],
  )

  const removeField = useCallback((id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id))
    setValues((prev) => {
      const next: CustomFieldValues = {}
      for (const [patientId, byField] of Object.entries(prev)) {
        const { [id]: _removed, ...rest } = byField
        next[patientId] = rest
      }
      return next
    })
  }, [])

  const slotsRemaining = useCallback(
    (type: CustomFieldType) => {
      const used = fields.filter((f) => f.type === type).length
      return Math.max(0, maxSlotsForType(type) - used)
    },
    [fields],
  )

  const getValues = useCallback(
    (patientId: string) => values[patientId] ?? {},
    [values],
  )

  const setValue = useCallback(
    (patientId: string, fieldId: string, value: string) => {
      setValues((prev) => ({
        ...prev,
        [patientId]: { ...(prev[patientId] ?? {}), [fieldId]: value },
      }))
    },
    [],
  )

  const setValuesForPatient = useCallback(
    (patientId: string, next: Record<string, string>) => {
      setValues((prev) => ({ ...prev, [patientId]: { ...next } }))
    },
    [],
  )

  const value = useMemo<CustomFieldsContextValue>(
    () => ({
      fields,
      addField,
      renameField,
      removeField,
      slotsRemaining,
      values,
      getValues,
      setValue,
      setValuesForPatient,
    }),
    [
      fields,
      addField,
      renameField,
      removeField,
      slotsRemaining,
      values,
      getValues,
      setValue,
      setValuesForPatient,
    ],
  )

  return (
    <CustomFieldsContext.Provider value={value}>
      {children}
    </CustomFieldsContext.Provider>
  )
}

export function useCustomFields() {
  const ctx = useContext(CustomFieldsContext)
  if (!ctx) {
    throw new Error('useCustomFields must be used within a CustomFieldsProvider')
  }
  return ctx
}

// ---- JSON value validation -------------------------------------------------
// Lightweight validation of a JSON field's value against its optional schema:
// the value must be valid JSON, and any required keys declared by the schema
// must be present. Returns an error string, or null when valid. Empty values
// are allowed (they render as an em dash).
export function validateJsonValue(
  raw: string | undefined,
  schema?: string,
): string | null {
  const value = raw?.trim()
  if (!value) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    return 'Enter valid JSON.'
  }

  const schemaText = schema?.trim()
  if (!schemaText) return null

  let parsedSchema: unknown
  try {
    parsedSchema = JSON.parse(schemaText)
  } catch {
    // A malformed schema can't constrain the value; treat as no schema.
    return null
  }

  const requiredKeys = extractRequiredKeys(parsedSchema)
  if (requiredKeys.length === 0) return null

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return `Value must be a JSON object with keys: ${requiredKeys.join(', ')}.`
  }
  const obj = parsed as Record<string, unknown>
  const missing = requiredKeys.filter((k) => !(k in obj))
  if (missing.length > 0) {
    return `Missing required key${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}.`
  }
  return null
}

// Derive required keys from a schema. Supports JSON-Schema style
// ({ "required": ["a","b"] }) and falls back to treating the top-level keys of
// a plain example object (or its `properties`) as required.
function extractRequiredKeys(schema: unknown): string[] {
  if (typeof schema !== 'object' || schema === null) return []
  const s = schema as Record<string, unknown>
  if (Array.isArray(s.required)) {
    return s.required.filter((k): k is string => typeof k === 'string')
  }
  if (s.properties && typeof s.properties === 'object') {
    return Object.keys(s.properties as Record<string, unknown>)
  }
  return Object.keys(s)
}

// Format a stored custom value for display in the grid / record view, by type.
export function formatCustomValue(
  type: CustomFieldType,
  raw: string | undefined,
): string {
  if (raw === undefined || raw === null || raw.trim() === '') return '—'

  if (type === 'date') {
    const d = new Date(`${raw}T00:00:00`)
    return Number.isNaN(d.getTime())
      ? raw
      : d.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
  }
  if (type === 'timestamp') {
    const d = new Date(raw)
    return Number.isNaN(d.getTime())
      ? raw
      : d.toLocaleString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
  }
  if (type === 'json') {
    // Show compact single-line JSON when parseable; otherwise the raw text.
    try {
      return JSON.stringify(JSON.parse(raw))
    } catch {
      return raw
    }
  }
  if (type === 'file') {
    // Plain-text fallback (grid cells): the file name.
    const ref = parseFileRef(raw)
    return ref ? ref.name : '—'
  }
  // integer / decimal / text render as-is.
  return raw
}

// ---- File / Image references ----------------------------------------------
// A `file`-type field stores a lightweight JSON reference (NOT the file bytes)
// so localStorage never overflows: name, MIME type, byte size, and — for
// images only — a small downscaled thumbnail data URL for preview.
export type FileRef = {
  name: string
  mime: string
  size: number
  // Present only for images: a downscaled JPEG/PNG data URL (~<=10KB).
  thumb?: string
}

export function parseFileRef(raw: string | undefined): FileRef | null {
  if (!raw || !raw.trim()) return null
  try {
    const parsed = JSON.parse(raw) as Partial<FileRef>
    if (parsed && typeof parsed.name === 'string') {
      return {
        name: parsed.name,
        mime: typeof parsed.mime === 'string' ? parsed.mime : '',
        size: typeof parsed.size === 'number' ? parsed.size : 0,
        thumb: typeof parsed.thumb === 'string' ? parsed.thumb : undefined,
      }
    }
  } catch {
    // not a serialized ref
  }
  return null
}

export function serializeFileRef(ref: FileRef): string {
  return JSON.stringify(ref)
}

export function isImageMime(mime: string): boolean {
  return mime.startsWith('image/')
}

// Read a selected File into a lightweight FileRef. For images, downscale to a
// small thumbnail data URL (max 96px on the long edge) via canvas so we persist
// a preview without the full bytes. Non-images get name/MIME/size only.
export async function fileToRef(file: File): Promise<FileRef> {
  const base: FileRef = {
    name: file.name,
    mime: file.type || 'application/octet-stream',
    size: file.size,
  }
  if (!isImageMime(base.mime)) return base
  try {
    const thumb = await makeImageThumbnail(file, 96)
    if (thumb) base.thumb = thumb
  } catch {
    // ignore thumbnail failures — the reference is still useful without it
  }
  return base
}

function makeImageThumbnail(file: File, maxEdge: number): Promise<string | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(null)
        return
      }
      ctx.drawImage(img, 0, 0, w, h)
      // PNG preserves transparency; JPEG is smaller for photos. Use JPEG at
      // modest quality to keep the data URL small (well under the quota).
      const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
      resolve(canvas.toDataURL(mime, 0.7))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    img.src = url
  })
}
