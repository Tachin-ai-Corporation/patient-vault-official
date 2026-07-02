'use client'

import { useState } from 'react'
import { KeyRound, Lock, RotateCw, Trash2, ShieldAlert, Vault } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { CopyButton } from '@/components/ui/copy-button'

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

const KEY_PREFIX = 'pv_sk_live_'
const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

function randomSecret(): string {
  let body = ''
  for (let i = 0; i < 32; i++) {
    body += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return KEY_PREFIX + body
}

function mask(): string {
  return `${KEY_PREFIX}${'•'.repeat(24)}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
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

export function ConsoleApiKey() {
  // Seed with a pre-existing key that is already masked — this is the default
  // state a returning developer sees (the secret was shown once at creation).
  const [keyRecord, setKeyRecord] = useState<MaskedKey | null>(() => ({
    id: 'key_default',
    masked: mask(),
    created: '2026-06-12T00:00:00.000Z',
  }))

  // When non-null, the full secret is shown EXACTLY ONCE in a highlighted
  // panel. Dismissing it returns the surface to the masked state permanently.
  const [oneTimeSecret, setOneTimeSecret] = useState<string | null>(null)

  const [rotateOpen, setRotateOpen] = useState(false)
  const [revokeOpen, setRevokeOpen] = useState(false)

  function issueKey() {
    const secret = randomSecret()
    setKeyRecord({
      id: `key_${Date.now().toString(36)}`,
      masked: mask(),
      created: new Date().toISOString(),
    })
    setOneTimeSecret(secret)
  }

  function confirmRotate() {
    issueKey()
    setRotateOpen(false)
  }

  function confirmRevoke() {
    setKeyRecord(null)
    setOneTimeSecret(null)
    setRevokeOpen(false)
  }

  return (
    <section className="rounded-card border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-tag border border-border bg-muted text-accent">
          <KeyRound className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            API key
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
            A single server-side secret for this vault. It is shown in full once
            at creation, then masked permanently. Rotate to replace it or revoke
            to disable it.
          </p>
        </div>
      </div>

      {/* One-time reveal — only rendered immediately after create/rotate. */}
      {oneTimeSecret ? (
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
            onClick={() => setOneTimeSecret(null)}
          >
            I&apos;ve stored my key
          </Button>
        </div>
      ) : keyRecord ? (
        // Masked state — the steady-state view of an existing key.
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
            <Button variant="outline" size="sm" onClick={() => setRotateOpen(true)}>
              <RotateCw className="h-3.5 w-3.5" data-icon="inline-start" />
              Rotate
            </Button>
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
      ) : (
        // No key — offer to create one.
        <div className="mt-4 rounded-card border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
          <KeyRound className="mx-auto h-5 w-5 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            No API key. Create one to start making requests.
          </p>
          <Button className="mt-4" onClick={issueKey}>
            <KeyRound className="h-4 w-4" data-icon="inline-start" />
            Create API key
          </Button>
        </div>
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
          Make sure you can update wherever the current key is used — the new
          key is displayed only once.
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
          This cannot be undone. If you only want to replace the key, rotate it
          instead.
        </p>
      </Modal>
    </section>
  )
}
