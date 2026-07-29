'use client'

import { useEffect, useState } from 'react'
import { KeyRound, Lock, RotateCw, Trash2, ShieldAlert, Vault } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { CopyButton } from '@/components/ui/copy-button'
import { EnvBadge } from '@/components/env-badge'
import { useSession, type ApiEnv } from '@/lib/session-context'
import { keyPrefixFor } from '@/lib/environments'

// ---- MOCK key model --------------------------------------------------------
// SWAP POINT: in production the secret is issued server-side. Generation
// returns the full secret EXACTLY ONCE; the server stores only a hash + a
// display prefix. The strings below are client-side placeholders so the surface
// is explorable — they authenticate nothing.

type MaskedKey = {
  id: string
  // The masked representation shown after the one-time reveal.
  masked: string
  created: string // ISO date
}

const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

// Both generators take the prefix explicitly rather than reading a module-level
// constant, so a key body can never be produced without a caller having stated
// which environment it belongs to.
function randomSecret(prefix: string): string {
  let body = ''
  for (let i = 0; i < 32; i++) {
    body += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return prefix + body
}

function mask(prefix: string): string {
  return `${prefix}${'•'.repeat(24)}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Environment-specific reach of the secret. The staging line is the important
// one: it tells the developer the key in front of them cannot touch real
// patients, which is what makes the sandbox safe to experiment in.
const REACH_COPY: Record<ApiEnv, string> = {
  staging: 'A staging key reaches synthetic records only.',
  production: 'A production key reaches live patient records, and every request is audited.',
}

// The two helper strings are required copy and are surfaced wherever the key
// is shown.
function KeyGuidance() {
  return (
    <ul className="mt-3 flex flex-col gap-1.5 text-sm leading-relaxed text-muted-foreground">
      <li className="flex items-start gap-2">
        <Vault className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <span>We recommend storing this in 1Password.</span>
      </li>
      <li className="flex items-start gap-2">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <span>Never share this key with your agent.</span>
      </li>
    </ul>
  )
}

/**
 * Body of the card for exactly ONE environment.
 *
 * Every value it needs arrives as a prop from the matching environment's own
 * state, so this component never has to decide which environment it is looking
 * at — and the two environments' secrets are never combined into a shared
 * variable on the way in.
 */
function ApiKeyPanel({
  keyRecord,
  oneTimeSecret,
  onCreate,
  onDismissSecret,
  onRotate,
  onRevoke,
}: {
  keyRecord: MaskedKey | null
  oneTimeSecret: string | null
  onCreate: () => void
  onDismissSecret: () => void
  onRotate: () => void
  onRevoke: () => void
}) {
  // One-time reveal — only rendered immediately after create/rotate.
  if (oneTimeSecret) {
    return (
      <div className="mt-4 rounded-card border border-accent/40 bg-accent/5 p-4">
        <p className="font-mono text-[10px] uppercase tracking-wider text-accent">
          shown once — copy it now
        </p>
        <div className="mt-2 flex items-center gap-2 rounded-input border border-border bg-background px-3 py-2">
          <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-foreground">
            {oneTimeSecret}
          </code>
          <CopyButton value={oneTimeSecret} label="Copy API key" />
        </div>
        <KeyGuidance />
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={onDismissSecret}
        >
          I&apos;ve stored my key
        </Button>
      </div>
    )
  }

  // Masked state — the steady-state view of an existing key.
  if (keyRecord) {
    return (
      <div className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-input border border-border bg-muted/40 px-3 py-2.5">
          <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-foreground">
            {keyRecord.masked}
          </code>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-button border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            <Lock className="h-3 w-3" />
            Masked
          </span>
        </div>
        <p className="mt-2 font-mono text-[11px] text-muted-foreground">
          created {formatDate(keyRecord.created)}
        </p>
        <KeyGuidance />
        <div className="mt-4 flex items-center gap-2">
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
    )
  }

  // No key — offer to create one.
  return (
    <div className="mt-4 rounded-card border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
      <KeyRound className="mx-auto h-5 w-5 text-muted-foreground" />
      <p className="mt-2 text-sm text-muted-foreground">
        No API key. Create one to start making requests.
      </p>
      <Button className="mt-4" onClick={onCreate}>
        <KeyRound className="h-4 w-4" data-icon="inline-start" />
        Create API key
      </Button>
    </div>
  )
}

export function ConsoleApiKey() {
  const { currentEnv } = useSession()

  // Each environment's key lives in its own explicitly named state. They are
  // deliberately NOT collapsed into a `Record<ApiEnv, ...>` or swapped through
  // one "current key" variable: keeping them physically separate means a
  // staging secret can never be rendered, copied, or rotated while Production
  // is active (or vice versa) through a stale shared value.
  const [stagingKeyRecord, setStagingKeyRecord] = useState<MaskedKey | null>(
    () => ({
      id: 'key_staging_default',
      masked: mask(keyPrefixFor('staging')),
      created: '2026-06-12T00:00:00.000Z',
    }),
  )
  const [productionKeyRecord, setProductionKeyRecord] =
    useState<MaskedKey | null>(() => ({
      id: 'key_production_default',
      masked: mask(keyPrefixFor('production')),
      created: '2026-07-03T00:00:00.000Z',
    }))

  // Likewise for the one-time reveals: a full secret is only ever written to
  // the variable belonging to the environment that issued it.
  const [stagingOneTimeSecret, setStagingOneTimeSecret] = useState<
    string | null
  >(null)
  const [productionOneTimeSecret, setProductionOneTimeSecret] = useState<
    string | null
  >(null)

  // Leaving an environment ends its one-time reveal. Without this, a full
  // secret issued in one environment stays rendered and would still be on
  // screen when the developer switched away and later came back — which
  // contradicts the card's "masked permanently" promise and needlessly keeps a
  // live credential in the DOM. Only the departed environment is cleared, so
  // the reveal survives unrelated re-renders.
  useEffect(() => {
    if (currentEnv === 'production') {
      setStagingOneTimeSecret(null)
    } else {
      setProductionOneTimeSecret(null)
    }
  }, [currentEnv])

  // Modal visibility is environment-agnostic UI state (no key material), so a
  // single flag each is safe; the confirm handlers below branch on the active
  // environment to decide which key they act on.
  const [rotateOpen, setRotateOpen] = useState(false)
  const [revokeOpen, setRevokeOpen] = useState(false)

  function issueStagingKey() {
    const prefix = keyPrefixFor('staging')
    setStagingKeyRecord({
      id: `key_staging_${Date.now().toString(36)}`,
      masked: mask(prefix),
      created: new Date().toISOString(),
    })
    setStagingOneTimeSecret(randomSecret(prefix))
  }

  function issueProductionKey() {
    const prefix = keyPrefixFor('production')
    setProductionKeyRecord({
      id: `key_production_${Date.now().toString(36)}`,
      masked: mask(prefix),
      created: new Date().toISOString(),
    })
    setProductionOneTimeSecret(randomSecret(prefix))
  }

  function confirmRotate() {
    if (currentEnv === 'production') {
      issueProductionKey()
    } else {
      issueStagingKey()
    }
    setRotateOpen(false)
  }

  function confirmRevoke() {
    if (currentEnv === 'production') {
      setProductionKeyRecord(null)
      setProductionOneTimeSecret(null)
    } else {
      setStagingKeyRecord(null)
      setStagingOneTimeSecret(null)
    }
    setRevokeOpen(false)
  }

  return (
    <section className="rounded-card border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-tag border border-border bg-muted text-accent">
          <KeyRound className="h-4 w-4" />
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              API key
            </h2>
            {/* Same badge component as the header selector, so the card's
                environment can never visually contradict the header. */}
            <EnvBadge env={currentEnv} />
          </div>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
            A single server-side secret for this vault, scoped to this
            environment. {REACH_COPY[currentEnv]} It is shown in full once at
            creation, then masked permanently. Rotate to replace it or revoke to
            disable it.
          </p>
        </div>
      </div>

      {/* Render the panel for the active environment only, passing that
          environment's own state straight through. */}
      {currentEnv === 'production' ? (
        <ApiKeyPanel
          keyRecord={productionKeyRecord}
          oneTimeSecret={productionOneTimeSecret}
          onCreate={issueProductionKey}
          onDismissSecret={() => setProductionOneTimeSecret(null)}
          onRotate={() => setRotateOpen(true)}
          onRevoke={() => setRevokeOpen(true)}
        />
      ) : (
        <ApiKeyPanel
          keyRecord={stagingKeyRecord}
          oneTimeSecret={stagingOneTimeSecret}
          onCreate={issueStagingKey}
          onDismissSecret={() => setStagingOneTimeSecret(null)}
          onRotate={() => setRotateOpen(true)}
          onRevoke={() => setRevokeOpen(true)}
        />
      )}

      {/* Rotate confirm */}
      <Modal
        open={rotateOpen}
        onClose={() => setRotateOpen(false)}
        title="Rotate API key?"
        description="A new secret is issued and shown once. The previous key stops working immediately."
        footer={
          <>
            <Button variant="ghost" onClick={() => setRotateOpen(false)}>
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
          This affects the <span className="font-medium text-foreground">{currentEnv}</span>{' '}
          key only. Make sure you can update wherever the current key is used —
          the new key is displayed only once.
        </p>
      </Modal>

      {/* Revoke confirm */}
      <Modal
        open={revokeOpen}
        onClose={() => setRevokeOpen(false)}
        title="Revoke API key?"
        description="This immediately and permanently disables the key. Any service still using it will start receiving 401 errors."
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
          This revokes the{' '}
          <span className="font-medium text-foreground">{currentEnv}</span> key
          and cannot be undone. If you only want to replace the key, rotate it
          instead.
        </p>
      </Modal>
    </section>
  )
}
