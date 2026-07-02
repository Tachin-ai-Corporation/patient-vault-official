'use client'

// Ecosystem + partner program. SWAP POINT: every connection below except the
// Agent Access (MCP) link is illustrative and non-functional — webhook
// subscriptions, FHIR/EHR bridges, and export are "coming soon" placeholders.

import Link from 'next/link'
import { ArrowRight, Bot, Webhook, Network } from 'lucide-react'
import { useSession } from '@/lib/session-context'
import { Button } from '@/components/ui/button'
import { TextInput } from '@/components/ui/field'
import { DeidentifiedExport } from '@/components/integrations/de-identified-export'

function ComingSoonChip() {
  return (
    <span className="inline-flex items-center rounded-tag border border-border bg-muted px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
      Coming soon
    </span>
  )
}

function AvailableChip() {
  return (
    <span className="inline-flex items-center rounded-tag border border-success/40 bg-success/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-success">
      Available
    </span>
  )
}

function GroupHeading({
  step,
  title,
  children,
}: {
  step: string
  title: string
  children?: React.ReactNode
}) {
  return (
    <div className="mb-4">
      <p className="font-mono text-[10px] uppercase tracking-wider text-accent">
        {step}
      </p>
      <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      {children && (
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
          {children}
        </p>
      )}
    </div>
  )
}

const ECOSYSTEM = [
  { name: 'EHR via FHIR (Epic)', desc: 'Read clinical records from Epic over FHIR.' },
  { name: 'Redox', desc: 'Exchange data through the Redox network.' },
  { name: 'Health Gorilla', desc: 'National clinical data and labs.' },
  { name: 'FHIR R4 Bundle Export', desc: 'Export records as FHIR R4 bundles.' },
]

// Honest map to PV capabilities: the three events PV can emit today are
// Available; the rest ride on roadmap features (Find/dedupe, merge-as-redirect,
// consent, audit packets) and are Coming soon. Delivery stays non-functional.
const WEBHOOK_EVENTS: {
  name: string
  desc: string
  available: boolean
}[] = [
  {
    name: 'patient.created',
    desc: 'A new patient record was written to the vault.',
    available: true,
  },
  {
    name: 'patient.updated',
    desc: 'An existing patient record changed.',
    available: true,
  },
  {
    name: 'attachment.added',
    desc: 'A document or file was attached to a patient.',
    available: true,
  },
  {
    name: 'patient.duplicate_detected',
    desc: 'Find/dedupe flagged a likely duplicate on write.',
    available: false,
  },
  {
    name: 'patient.merged',
    desc: 'Two records were merged via merge-as-redirect.',
    available: false,
  },
  {
    name: 'consent.revoked',
    desc: 'A patient consent record was revoked.',
    available: false,
  },
  {
    name: 'audit_packet.completed',
    desc: 'A compliance audit packet finished generating.',
    available: false,
  },
]

export function IntegrationsView() {
  const { session } = useSession()
  const { partner } = session

  return (
    <div className="flex flex-col gap-10">
      {/* Header */}
      <div>
        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          integrations
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Integrations
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
          Patient Vault connects the developer&apos;s app to the clinical
          ecosystem — and lets agents reach it over MCP.
        </p>
      </div>

      {/* 1. Agent connections */}
      <section>
        <GroupHeading step="01 · agents" title="Agent connections" />
        <Link
          href="/agent-access"
          className="group flex items-center justify-between gap-4 rounded-card border border-border bg-card p-4 transition-colors hover:border-accent/50"
        >
          <div className="flex items-start gap-3">
            <Bot className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Connect agents over MCP
                </h3>
                <span className="inline-flex items-center rounded-tag border border-success/40 bg-success/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-success">
                  Live
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground text-pretty">
                OAuth 2.1 over a standalone MCP server. Configure in Agent
                Access.
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
        </Link>
      </section>

      {/* 2. Clinical ecosystem */}
      <section>
        <GroupHeading step="02 · clinical" title="Clinical ecosystem">
          Where Patient Vault sits between your app and the real clinical world.
        </GroupHeading>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {ECOSYSTEM.map((item) => (
            <div
              key={item.name}
              className="flex items-start justify-between gap-3 rounded-card border border-border bg-card p-4"
            >
              <div className="flex items-start gap-3">
                <Network className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {item.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground text-pretty">
                    {item.desc}
                  </p>
                </div>
              </div>
              <ComingSoonChip />
            </div>
          ))}
        </div>
        <div className="mt-4">
          <DeidentifiedExport />
        </div>
      </section>

      {/* 3. Webhooks */}
      <section>
        <GroupHeading step="03 · webhooks" title="Webhooks">
          Subscribe to vault events. Delivery is non-functional in this preview.
        </GroupHeading>
        <div className="rounded-card border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Webhook className="h-4 w-4 text-accent" />
            <span className="font-mono text-[11px] uppercase tracking-wider text-foreground">
              Subscribable events
            </span>
            <ComingSoonChip />
          </div>
          <ul className="mb-4 flex flex-col divide-y divide-border rounded-card border border-border">
            {WEBHOOK_EVENTS.map((evt) => (
              <li
                key={evt.name}
                className="flex items-start justify-between gap-3 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <span className="font-mono text-[13px] text-foreground">
                    {evt.name}
                  </span>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground text-pretty">
                    {evt.desc}
                  </p>
                </div>
                {evt.available ? <AvailableChip /> : <ComingSoonChip />}
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <TextInput
              placeholder="https://your-app.com/webhooks/1health"
              disabled
              className="font-mono opacity-60"
            />
            <Button variant="outline" disabled className="shrink-0">
              Add endpoint
            </Button>
          </div>
        </div>
      </section>

      {/* 4. Partner program */}
      <section>
        <GroupHeading step="04 · partner program" title="Partner program">
          Partner referrals raise a developer&apos;s free ceiling.
        </GroupHeading>
        <div className="rounded-card border border-border bg-card p-5">
          <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
            A partner referral via the{' '}
            <span className="font-mono text-foreground">dcp</span> parameter
            raises your free ceiling from{' '}
            <span className="font-mono text-foreground">1,000</span> to{' '}
            <span className="font-mono text-foreground">25,000</span> patients.
          </p>
          {partner ? (
            <div className="mt-4 flex items-center gap-2 rounded-input border border-accent/30 bg-accent/10 px-3 py-2">
              <span className="text-sm text-foreground">Active partner:</span>
              <code className="font-mono text-[13px] text-accent">
                dcp={partner}
              </code>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground text-pretty">
              No partner is active. Arrive with{' '}
              <span className="font-mono text-foreground">?dcp=&lt;partner&gt;</span>{' '}
              in the URL to activate a raised ceiling.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
