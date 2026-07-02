'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { Bot, Lock, Eye, EyeOff, Trash2, Plus } from 'lucide-react'
import { useSession } from '@/lib/session-context'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { CopyButton } from '@/components/ui/copy-button'

// ---- MOCK agent-key model --------------------------------------------------
// The agent key is SEMANTICALLY DISTINCT from an API key: it is the credential
// an autonomous agent presents to reach this vault, and there is exactly ONE
// per vault (project). SWAP POINT: in production this is minted server-side and
// is the bootstrap secret an agent exchanges for short-lived OAuth 2.1 tokens;
// the random string below authenticates nothing.
type AgentKey = {
  secret: string
  created: string // ISO date
  lastUsed: string | null
}

function randomAgentSecret(): string {
  const alphabet =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let body = ''
  for (let i = 0; i < 36; i++) {
    body += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return `pv_agent_${body}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function maskSecret(): string {
  return `pv_agent_${'•'.repeat(24)}`
}

export function AgentKeySection() {
  const { currentProject } = useSession()

  // One key per vault. Reset whenever the active project changes so the key is
  // always scoped to the project (vault) currently in view.
  const [agentKey, setAgentKey] = useState<AgentKey | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [revokeOpen, setRevokeOpen] = useState(false)

  useEffect(() => {
    setAgentKey(null)
    setRevealed(false)
  }, [currentProject.id])

  function createKey(e?: FormEvent) {
    e?.preventDefault()
    // SWAP POINT: real issuance returns the secret once from the server.
    setAgentKey({
      secret: randomAgentSecret(),
      created: new Date().toISOString(),
      lastUsed: null,
    })
    setRevealed(true)
  }

  function confirmRevoke() {
    setAgentKey(null)
    setRevealed(false)
    setRevokeOpen(false)
  }

  return (
    <section className="rounded-card border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-tag border border-border bg-muted text-accent">
            <Bot className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-foreground">
              Agent key
            </h3>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground text-pretty">
              A single, vault-scoped credential an agent presents to reach{' '}
              <span className="font-medium text-foreground">
                {currentProject.name}
              </span>
              . Distinct from an API key — one agent key per vault.
            </p>
          </div>
        </div>
      </div>

      {agentKey ? (
        <div className="mt-5">
          <div className="flex items-start justify-between gap-3">
            <p className="font-mono text-[11px] text-muted-foreground">
              created {formatDate(agentKey.created)} · last used{' '}
              {agentKey.lastUsed ? formatDate(agentKey.lastUsed) : 'never'}
            </p>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRevokeOpen(true)}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" data-icon="inline-start" />
                Revoke
              </Button>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-input border border-border bg-muted/50 px-3 py-2">
            <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-foreground">
              {revealed ? agentKey.secret : maskSecret()}
            </code>
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              aria-label={revealed ? 'Hide agent key' : 'Reveal agent key'}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-input text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {revealed ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
            </button>
            <CopyButton value={agentKey.secret} label="Copy agent key" />
          </div>

          <p className="mt-3 text-xs leading-relaxed text-muted-foreground text-pretty">
            Treat the agent key like a password — it grants an agent the same
            bounded, audited access this console has. If it may be compromised,
            revoke it and create a new one; revoking immediately cuts off agent
            access.
          </p>
        </div>
      ) : (
        <div className="mt-5 rounded-card border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="mt-3 text-sm font-medium text-foreground">
            No agent key for this vault
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
            Create the one agent key for {currentProject.name} to let an agent
            connect. You can rotate or revoke it at any time.
          </p>
          <Button className="mt-4" onClick={() => createKey()}>
            <Plus className="h-4 w-4" data-icon="inline-start" />
            Create agent key
          </Button>
        </div>
      )}

      {/* Revoke confirm */}
      <Modal
        open={revokeOpen}
        onClose={() => setRevokeOpen(false)}
        title="Revoke agent key?"
        description="This immediately and permanently disables agent access to this vault."
        footer={
          <>
            <Button variant="ghost" onClick={() => setRevokeOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmRevoke}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4" data-icon="inline-start" />
              Revoke key
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          Any agent currently using this key will start receiving 401 errors.
          You can create a new agent key afterward.
        </p>
      </Modal>
    </section>
  )
}
