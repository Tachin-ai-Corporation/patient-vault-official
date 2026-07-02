'use client'

// Illustrative, non-functional representation of how agents connect to the
// Patient Vault. The real flow is OAuth 2.1 with PKCE against a standalone MCP
// resource server (1health is NOT an identity provider). SWAP POINT: the
// connection block, tool surface, audit log, and spec links below are static
// mocks — wire them to the live MCP discovery + OAuth metadata documents.

import { Database, Server, ShieldCheck, FileJson } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CodeLine } from '@/components/ui/code-line'
import { CopyButton } from '@/components/ui/copy-button'
import { AuditDashboard } from '@/components/agent-access/audit-dashboard'

const MCP_URL = 'https://mcp.1health.io'

// The ENTIRE surface an agent sees. Small and legible by design.
const DATA_TOOLS = [
  { name: 'Patient', desc: 'Read a patient record by id.' },
  { name: 'Address', desc: 'Read addresses on a patient record.' },
  { name: 'Contact', desc: 'Read phone and email contacts.' },
  { name: 'Attach', desc: 'List attachment metadata (never payloads).' },
  { name: 'Find', desc: 'Ranked, bounded patient lookup.' },
]

const CONTROL_TOOLS = [
  { name: 'list-projects', desc: 'Enumerate projects the token can reach.' },
  { name: 'switch-project', desc: 'Scope subsequent calls to one project.' },
  {
    name: 'logout / switch-account',
    desc: 'Drop the session or change the acting account.',
  },
]

const SPEC_LINKS = ['/openapi.json', '/llms.txt', '/agent-brief']

function SectionHeading({
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

function ToolRow({ name, desc }: { name: string; desc: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 rounded-input border border-border bg-muted/30 px-3 py-2.5">
      <code className="shrink-0 font-mono text-[13px] text-foreground">
        {name}
      </code>
      <span className="text-right text-xs text-muted-foreground text-pretty">
        {desc}
      </span>
    </div>
  )
}

export function AgentAccessView() {
  return (
    <div className="flex flex-col gap-10">
      {/* Page header */}
      <div>
        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          agent_access
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Agent Access
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
          The vault is a bounded, auditable surface — that is exactly what makes
          agent access defensible. The surface is small, coded, and reviewable,
          and everything this console does, an agent can call.
        </p>
      </div>

      {/* 1. Connection panel */}
      <section className="rounded-card border border-border bg-card p-5">
        <SectionHeading step="01 · connect" title="Connection">
          Patient Vault exposes a standalone MCP server using OAuth 2.1 in the
          resource-server pattern. 1health authorizes access to the vault; it
          does not act as an identity provider.
        </SectionHeading>

        <div className="flex flex-col gap-2">
          <CodeLine value={MCP_URL} prefix="MCP" label="Copy MCP server URL" />
          <div className="flex items-start gap-2 rounded-input border border-border bg-muted/30 px-3 py-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Auth is{' '}
              <span className="font-mono text-foreground">OAuth 2.1 (PKCE)</span>{' '}
              — not API keys. Tokens are short-lived and scoped to a single
              project.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button className="bg-primary text-primary-foreground">
            <Server className="h-4 w-4" data-icon="inline-start" />
            Add to Claude
          </Button>
          <Button variant="outline">
            <Server className="h-4 w-4" data-icon="inline-start" />
            Add to ChatGPT
          </Button>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            illustrative
          </span>
        </div>
      </section>

      {/* 2. The tool surface */}
      <section>
        <SectionHeading step="02 · surface" title="The tool surface">
          This is the entire surface an agent sees — small and legible by
          design. Contrast that with a general database handing an agent
          arbitrary SQL. Project selection is required from day one: an
          agent must choose a project before any data call.
        </SectionHeading>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-card border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Database className="h-4 w-4 text-accent" />
              <h3 className="font-mono text-[11px] uppercase tracking-wider text-foreground">
                Data tools
              </h3>
              <span className="font-mono text-[11px] text-muted-foreground">
                5
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {DATA_TOOLS.map((t) => (
                <ToolRow key={t.name} name={t.name} desc={t.desc} />
              ))}
            </div>
          </div>

          <div className="rounded-card border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Server className="h-4 w-4 text-accent" />
              <h3 className="font-mono text-[11px] uppercase tracking-wider text-foreground">
                Control-plane tools
              </h3>
              <span className="font-mono text-[11px] text-muted-foreground">
                3
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {CONTROL_TOOLS.map((t) => (
                <ToolRow key={t.name} name={t.name} desc={t.desc} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Scopes & audit */}
      <section>
        <SectionHeading step="03 · scopes & audit" title="Scopes and audit">
          Every agent call is OAuth-scoped to a single project and is
          audit-logged — both reads and writes. Nothing happens off the record.
          This is a live preview of what the API captures on every call.
        </SectionHeading>

        <AuditDashboard />
      </section>

      {/* 4. Spec links */}
      <section>
        <SectionHeading step="04 · specs" title="Specs for agents">
          Machine-readable descriptions of the surface. Illustrative paths —
          point your agent tooling at these documents.
        </SectionHeading>

        <div className="flex flex-col gap-2">
          {SPEC_LINKS.map((path) => (
            <div
              key={path}
              className="flex items-center gap-2 rounded-input border border-border bg-muted/50 px-3 py-2"
            >
              <FileJson className="h-4 w-4 shrink-0 text-accent" />
              <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-foreground">
                {path}
              </code>
              <CopyButton value={path} label={`Copy ${path}`} />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
