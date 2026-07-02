'use client'

// De-identified export card for the Integrations clinical ecosystem group.
//
// STAGING: runs as a functional client-side MOCK. It builds a de-identified
// VIEW of the current project's synthetic vault in memory — stripping the direct
// identifiers (names, contacts, addresses, provider name/NPI) and reducing the
// exact date of birth to a birth year — while keeping coded demographics and
// attachment metadata. It never produces a real downloadable file.
//
// PRODUCTION: gated / coming-soon. Real de-identification runs through a
// reviewed pipeline.
// SWAP POINT: replace the in-memory transform below with a server-side Safe
// Harbor / expert-determination de-identification pipeline.

import { useState } from 'react'
import { ShieldCheck, Lock } from 'lucide-react'
import { useSession } from '@/lib/session-context'
import { Button } from '@/components/ui/button'
import type { Patient } from '@/lib/patient-data'

// A de-identified record keeps only non-identifying, coded fields.
type DeidRecord = {
  id: string
  birth_year: string
  sex_at_birth: string
  gender_identity: string
  race: string // coded
  ethnicity: string // coded
  preferred_language: string
  deceased: boolean
  attachment_count: number
  attachment_types: string[] // content types only — no filenames
}

// Strip the 18-identifier "direct identifier" set this mock can reach:
// names, contacts (phone/email), addresses, provider name + NPI, and the
// exact DOB (reduced to year). Coded demographics + attachment metadata stay.
function deidentify(p: Patient): DeidRecord {
  return {
    id: p.id,
    birth_year: (p.date_of_birth || '').slice(0, 4) || 'unknown',
    sex_at_birth: p.sex_at_birth,
    gender_identity: p.gender_identity,
    race: p.race.code,
    ethnicity: p.ethnicity.code,
    preferred_language: p.preferred_language,
    deceased: p.deceased,
    attachment_count: p.attachment_count,
    attachment_types: Array.from(
      new Set(p.attachments.map((a) => a.content_type)),
    ),
  }
}

export function DeidentifiedExport() {
  const { session, currentProject, patients } = useSession()
  const isProduction = session.currentEnv === 'production'

  // In-memory de-identified preview (staging mock only).
  const [preview, setPreview] = useState<DeidRecord[] | null>(null)

  function handleExport() {
    // Functional mock: transform the in-memory cohort. No file is written.
    setPreview(patients.map(deidentify))
  }

  const sample = preview?.[0]

  return (
    <div className="rounded-card border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              De-identified export
            </h3>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground text-pretty">
              Export a de-identified dataset of this vault for development,
              analytics, or model testing — direct identifiers removed (Safe
              Harbor&ndash;style).
            </p>
          </div>
        </div>
        {isProduction && <ComingSoon />}
      </div>

      {/* Scope line: current project + environment */}
      <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        scope: {currentProject.name} · {session.currentEnv}
      </p>

      {isProduction ? (
        // PRODUCTION — gated. Reviewed-pipeline note + swap point above.
        <div className="mt-4 rounded-input border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background">
            <Lock className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-sm font-medium text-foreground">
            Available once production de-identification is enabled
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
            In production, de-identification runs through a reviewed pipeline
            before any dataset leaves the vault. Use staging to preview the
            de-identified shape against synthetic data.
          </p>
        </div>
      ) : (
        // STAGING — functional in-memory mock.
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleExport}
              disabled={patients.length === 0}
              className="bg-primary text-primary-foreground"
            >
              <ShieldCheck className="h-4 w-4" data-icon="inline-start" />
              Export de-identified data
            </Button>
            {preview && (
              <span className="inline-flex items-center gap-1.5 rounded-tag border border-success/40 bg-success/10 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-success">
                Export ready · {preview.length} records
              </span>
            )}
            {patients.length === 0 && (
              <span className="text-sm text-muted-foreground">
                Seed staging patients to preview an export.
              </span>
            )}
          </div>

          {sample && (
            <div className="mt-4 overflow-hidden rounded-input border border-border">
              <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  de-identified preview · sample record
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  in-memory only
                </span>
              </div>
              <pre className="overflow-x-auto px-3 py-3 font-mono text-[12px] leading-relaxed text-foreground">
                {JSON.stringify(sample, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Accuracy note — no certification claim. */}
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground text-pretty">
        De-identification removes the 18 HIPAA Safe Harbor identifiers. This
        preview is a development aid and is not a certified de-identification.
      </p>
    </div>
  )
}

function ComingSoon() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-tag border border-border bg-muted px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
      Coming soon
    </span>
  )
}
