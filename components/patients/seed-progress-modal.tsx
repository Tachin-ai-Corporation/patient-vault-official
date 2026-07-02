'use client'

import { CheckCircle2, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Progress } from '@/components/ui/progress'

type SeedProgressModalProps = {
  open: boolean
  total: number
  // Number of patients fully created so far.
  created: number
  // Current step label (e.g. "Adding contact for Maria Santos").
  status: string
  done: boolean
  onClose: () => void
}

export function SeedProgressModal({
  open,
  total,
  created,
  status,
  done,
  onClose,
}: SeedProgressModalProps) {
  const pct = total > 0 ? Math.round((created / total) * 100) : 0

  return (
    <Modal
      open={open}
      // While seeding is in progress the modal is not dismissible; once done the
      // backdrop/close is enabled.
      onClose={done ? onClose : () => {}}
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

        <p className="text-xs leading-relaxed text-muted-foreground">
          {done
            ? `Created ${created} patient${created === 1 ? '' : 's'}. You can close this dialog.`
            : 'Please keep this dialog open until seeding completes.'}
        </p>
      </div>
    </Modal>
  )
}
