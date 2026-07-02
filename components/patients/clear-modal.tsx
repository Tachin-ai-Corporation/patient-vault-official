'use client'

import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'

type ClearModalProps = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  projectName: string
  count: number
}

export function ClearModal({
  open,
  onClose,
  onConfirm,
  projectName,
  count,
}: ClearModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Clear vault"
      description={`This permanently removes all ${count} patient record${count === 1 ? '' : 's'} in ${projectName}, along with their addresses, contacts, and providers. This cannot be undone.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Clear vault
          </Button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-muted-foreground">
        After clearing, this project returns to an empty vault. You can re-seed
        synthetic patients at any time.
      </p>
    </Modal>
  )
}
