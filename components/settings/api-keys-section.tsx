'use client'

import { useMemo, useState, type FormEvent } from 'react'
import {
  KeyRound,
  Lock,
  Plus,
  RotateCw,
  Trash2,
  Eye,
  EyeOff,
} from 'lucide-react'
import { useSession, type ApiEnv } from '@/lib/session-context'
import { Button } from '@/components/ui/button'
import { Field, TextInput } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { CopyButton } from '@/components/ui/copy-button'
import { keyPrefixFor } from '@/lib/environments'

// ---- MOCK key model --------------------------------------------------------
// SWAP POINT: in production, secret keys are issued server-side by the key
// service. Generation returns the full secret exactly once; the server stores
// only a hash + a display prefix. The random strings below are client-side
// placeholders so the surface is explorable — they authenticate nothing.
type ApiKey = {
  id: string
  name: string
  secret: string
  created: string // ISO date
  lastUsed: string | null
}

function randomSecret(env: ApiEnv): string {
  const prefix = keyPrefixFor(env)
  const alphabet =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let body = ''
  for (let i = 0; i < 32; i++) {
    body += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return prefix + body
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function maskSecret(secret: string): string {
  // Show the prefix (through the env segment) then dots.
  const idx = secret.indexOf('_', secret.indexOf('_', 3) + 1)
  const prefix = idx > 0 ? secret.slice(0, idx + 1) : secret.slice(0, 14)
  return `${prefix}${'•'.repeat(24)}`
}

function EnvSwitch({
  value,
  onChange,
}: {
  value: ApiEnv
  onChange: (env: ApiEnv) => void
}) {
  const envs: ApiEnv[] = ['staging', 'production']
  return (
    <div
      role="tablist"
      aria-label="API environment"
      className="inline-flex items-center gap-1 rounded-button border border-border bg-muted p-1"
    >
      {envs.map((env) => {
        const active = env === value
        return (
          <button
            key={env}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(env)}
            className={`rounded-input px-3 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors ${
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {env}
          </button>
        )
      })}
    </div>
  )
}

function KeyRow({
  apiKey,
  onRotate,
  onRevoke,
}: {
  apiKey: ApiKey
  onRotate: () => void
  onRevoke: () => void
}) {
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="rounded-card border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {apiKey.name}
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
            created {formatDate(apiKey.created)} · last used{' '}
            {apiKey.lastUsed ? formatDate(apiKey.lastUsed) : 'never'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="outline" size="sm" onClick={onRotate}>
            <RotateCw className="h-3.5 w-3.5" data-icon="inline-start" />
            Rotate
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRevoke}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" data-icon="inline-start" />
            Revoke
          </Button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-input border border-border bg-muted/50 px-3 py-2">
        <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-foreground">
          {revealed ? apiKey.secret : maskSecret(apiKey.secret)}
        </code>
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          aria-label={revealed ? 'Hide key' : 'Reveal key'}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-input text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {revealed ? (
            <EyeOff className="h-3.5 w-3.5" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
        </button>
        <CopyButton value={apiKey.secret} label={`Copy ${apiKey.name}`} />
      </div>
    </div>
  )
}

export function ApiKeysSection() {
  const { session, currentProject, setCurrentEnv, isProductionActivated, productionMaskedKey } =
    useSession()
  const { currentEnv } = session

  // Staging keys are mock secrets, seeded with one default key per project.
  // The seed uses STATIC values (fixed secret + dates) so server and client
  // render identically — random/Date.now() here would cause a hydration
  // mismatch. Keys created via interaction below are client-only, so those
  // safely use randomSecret().
  const [keys, setKeys] = useState<ApiKey[]>(() => [
    {
      id: 'key_default',
      name: 'Default',
      secret: `${keyPrefixFor('staging')}3aF9kQ2mD7sZ1xW8bN4tR6yL0pV5cH2j`,
      created: '2026-06-12T00:00:00.000Z',
      lastUsed: '2026-06-24T00:00:00.000Z',
    },
  ])

  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [rotateTarget, setRotateTarget] = useState<ApiKey | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null)

  const isStaging = currentEnv === 'staging'

  function createKey(e: FormEvent) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    // SWAP POINT: real issuance returns the secret once from the server.
    setKeys((prev) => [
      ...prev,
      {
        id: `key_${Date.now().toString(36)}`,
        name,
        secret: randomSecret('staging'),
        created: new Date().toISOString(),
        lastUsed: null,
      },
    ])
    setNewName('')
    setCreateOpen(false)
  }

  function confirmRotate() {
    if (!rotateTarget) return
    // Rotation issues a new secret for the same key, retiring the old one.
    setKeys((prev) =>
      prev.map((k) =>
        k.id === rotateTarget.id
          ? { ...k, secret: randomSecret('staging'), lastUsed: null }
          : k,
      ),
    )
    setRotateTarget(null)
  }

  function confirmRevoke() {
    if (!revokeTarget) return
    setKeys((prev) => prev.filter((k) => k.id !== revokeTarget.id))
    setRevokeTarget(null)
  }

  const headerDescription = useMemo(
    () =>
      `Server-to-server credentials for ${currentProject.name}, scoped to the selected environment.`,
    [currentProject.name],
  )

  return (
    <section className="rounded-card border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-accent">
            04 · api keys
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
            API keys
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
            {headerDescription}
          </p>
        </div>
        <EnvSwitch value={currentEnv} onChange={setCurrentEnv} />
      </div>

      {/* Server-side-only helper */}
      <div className="mt-4 flex items-start gap-2 rounded-input border border-accent/30 bg-accent/5 px-3 py-2.5">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          Patient Vault keys are{' '}
          <span className="font-medium text-foreground">server-side only</span>.
          Never expose a key in client code, URLs, or query params. There is no
          publishable or client-side key — there is no safe pattern for
          client-side PHI access.
        </p>
      </div>

      {/* Cross-reference to Agent Access (OAuth/MCP path) */}
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground text-pretty">
        Building an agent or MCP integration? Those use OAuth 2.1, not API keys
        — see{' '}
        <a
          href="/agent-access"
          className="font-medium text-accent underline-offset-2 hover:underline"
        >
          Agent Access
        </a>
        .
      </p>

      {isStaging ? (
        <div className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              {keys.length} staging {keys.length === 1 ? 'key' : 'keys'}
            </p>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5" data-icon="inline-start" />
              New key
            </Button>
          </div>

          {keys.length > 0 ? (
            <div className="flex flex-col gap-3">
              {keys.map((k) => (
                <KeyRow
                  key={k.id}
                  apiKey={k}
                  onRotate={() => setRotateTarget(k)}
                  onRevoke={() => setRevokeTarget(k)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-card border border-dashed border-border px-4 py-8 text-center">
              <KeyRound className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No staging keys. Create one to start making API calls.
              </p>
            </div>
          )}

          {/* Security guidance — calm, factual */}
          <div className="mt-4 space-y-1.5 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground text-pretty">
            <p>
              Rotating issues a new key and lets you retire the old one without
              downtime — deploy the new key, then revoke the previous one.
            </p>
            <p>
              Staging keys are revealable because they only touch synthetic
              data. If a key is ever leaked, rotate it immediately.
            </p>
          </div>
        </div>
      ) : isProductionActivated && productionMaskedKey ? (
        // PRODUCTION ACTIVATED — the live key was shown once in the go-live
        // success screen and is masked permanently here.
        // SWAP POINT: real production key issuance + rotation happens server
        // side; this surface only ever displays the masked value.
        <div className="mt-5">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Production secret key
          </p>
          <div className="flex items-center justify-between gap-3 rounded-card border border-border bg-card px-4 py-3">
            <code className="truncate font-mono text-sm text-foreground">
              {productionMaskedKey}
            </code>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-button border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              <Lock className="h-3 w-3" />
              Masked
            </span>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground text-pretty">
            Your production key was shown once at activation and cannot be
            revealed again. If you&apos;ve lost it or it may be compromised,
            rotate it to issue a replacement.
          </p>
        </div>
      ) : (
        // PRODUCTION — not yet activated. Generation is gated behind the
        // go-live human checkpoint (card, project verify, Developer Agreement, BAA).
        <div className="mt-5 rounded-card border border-dashed border-border bg-muted/30 px-4 py-10 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="mt-3 text-sm font-medium text-foreground">
            Activate production to generate live keys
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted-foreground text-pretty">
            Production keys are prefixed{' '}
            <span className="font-mono text-foreground">
              {keyPrefixFor('production')}…
            </span>{' '}
            and
            appear only after production is activated. For security, a
            production key is shown{' '}
            <span className="font-medium text-foreground">once</span> at
            generation and is masked permanently afterward — store it somewhere
            safe immediately.
          </p>
        </div>
      )}

      {/* Create key modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create staging key"
        description="Name the key for the service that will use it, e.g. ingestion-worker."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createKey} disabled={!newName.trim()}>
              Create key
            </Button>
          </>
        }
      >
        <form onSubmit={createKey}>
          <Field label="Key name" htmlFor="new-key-name">
            <TextInput
              id="new-key-name"
              placeholder="ingestion-worker"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="font-mono"
              autoFocus
            />
          </Field>
        </form>
      </Modal>

      {/* Rotate confirm */}
      <Modal
        open={!!rotateTarget}
        onClose={() => setRotateTarget(null)}
        title={`Rotate "${rotateTarget?.name ?? ''}"?`}
        description="A new secret is issued immediately. The current secret keeps working until you revoke it, so you can deploy without downtime."
        footer={
          <>
            <Button variant="ghost" onClick={() => setRotateTarget(null)}>
              Cancel
            </Button>
            <Button onClick={confirmRotate}>
              <RotateCw className="h-4 w-4" data-icon="inline-start" />
              Rotate key
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          After rotating, update your servers with the new key shown in the list,
          then revoke the old one.
        </p>
      </Modal>

      {/* Revoke confirm */}
      <Modal
        open={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        title={`Revoke "${revokeTarget?.name ?? ''}"?`}
        description="This immediately and permanently disables the key. Any service still using it will start receiving 401 errors."
        footer={
          <>
            <Button variant="ghost" onClick={() => setRevokeTarget(null)}>
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
          This cannot be undone. If you only want to replace the key, rotate it
          instead.
        </p>
      </Modal>
    </section>
  )
}
