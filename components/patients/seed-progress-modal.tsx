'use client'

import { CheckCircle2, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Progress } from '@/components/ui/progress'
import {
  SessionRecoveryNotice,
  type SessionRecoveryStatus,
} from '@/components/session-recovery'
import type { SessionEnvironment } from '@/lib/session-environments'

type SeedProgressModalProps = {
  open: boolean
  total: number
  // Number of patients fully created so far.
  created: number
  // Current step label (e.g. "Adding contact for Maria Santos").
  status: string
  done: boolean
  recovery: {
    status: Exclude<SessionRecoveryStatus, 'idle'>
    message: string | null
    environment: SessionEnvironment
    onAuthenticate: () => void
    onCheck: () => void
  } | null
  onClose: () => void
}

export function SeedProgressModal({
  open,
  total,
  created,
  status,
  done,
  recovery,
  onClose,
}: SeedProgressModalProps) {
  const pct = total > 0 ? Math.round((created / total) * 100) : 0

  return (
    <Modal
      open={open}
      // Dismissible at any time — clicking the backdrop, pressing Escape, or the
      // close button hides the dialog. Seeding runs independently of this modal,
      // so closing it does NOT stop the batch; it keeps running in the
      // background and you can watch each call land live in the API Inspector.
      onClose={onClose}
      title="Seeding sample data"
      description="Creating synthetic patient records in the vault via the 1health v3 API. Each patient is written with its contacts and addresses."
      className="max-w-lg"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-sm text-foreground">
            {done ? (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            <span aria-live="polite">{status}</span>
          </span>
          <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
            {created}/{total}
          </span>
        </div>

        <Progress value={pct} aria-label="Seeding progress" />

        {recovery && (
          <SessionRecoveryNotice
            status={recovery.status}
            message={recovery.message}
            environment={recovery.environment}
            onAuthenticate={recovery.onAuthenticate}
            onCheck={recovery.onCheck}
          />
        )}

        <p className="text-xs leading-relaxed text-muted-foreground">
          {done
            ? `Created ${created} patient${created === 1 ? '' : 's'}. You can close this dialog.`
            : 'You can close this dialog anytime — seeding continues in the background and each call appears live in the API Inspector.'}
        </p>
      </div>
    </Modal>
  )
}
