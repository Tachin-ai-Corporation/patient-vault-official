'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Lock, Trash2 } from 'lucide-react'
import { useSession } from '@/lib/session-context'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Field, TextInput } from '@/components/ui/field'

// Separated, destructive (Pulse) area in Settings. What it offers depends on
// the current project's environment and the referential guard:
//   • referenced records exist  → deletion is BLOCKED (calm tombstone note)
//   • production project         → GATED panel (request-only, BAA flow)
//   • staging project            → self-serve delete behind a typed confirm
export function DeleteProjectSection() {
  const {
    session,
    currentProject,
    isProductionActivated,
    projectReferenceCount,
    deleteProject,
  } = useSession()
  const router = useRouter()

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [requested, setRequested] = useState(false)

  const refCount = projectReferenceCount(currentProject.id)
  const blockedByReferences = refCount > 0

  function handleDelete() {
    const wasLast = session.projects.length <= 1
    // SWAP POINT: real staging deletion calls the deprovision endpoint.
    deleteProject(currentProject.id)
    setConfirmOpen(false)
    // If that was the last project, land on the safe onboarding state. (When
    // others remain, the section simply re-renders for the new current project.)
    if (wasLast) router.replace('/patients')
  }

  return (
    <section className="rounded-card border border-destructive/40 bg-destructive/5 p-5">
      <p className="font-mono text-[10px] uppercase tracking-wider text-destructive">
        06 · danger zone
      </p>
      <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
        Delete project
      </h2>

      {blockedByReferences ? (
        // ---- Referential guard: deletion blocked (both environments) --------
        // SWAP POINT: real check queries cross-project references before delete.
        <div className="mt-3 flex items-start gap-3 rounded-input border border-border bg-card p-4">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
            This project can&apos;t be deleted while{' '}
            <span className="font-medium text-foreground">
              {refCount} patient record{refCount === 1 ? '' : 's'}
            </span>{' '}
            {refCount === 1 ? 'is' : 'are'} referenced by other projects.
            Referenced records are tombstoned, not removed, until the references
            are released.
          </p>
        </div>
      ) : isProductionActivated ? (
        // ---- Production: gated, request-only (no self-serve delete) ---------
        // SWAP POINT: real flow initiates the BAA return-or-destroy process and
        // runs the cross-reference check; it does NOT delete immediately.
        <div className="mt-3">
          <div className="flex items-start gap-3 rounded-input border border-border bg-card p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
              <span className="font-medium text-foreground">
                {currentProject.name}
              </span>{' '}
              is in production and holds real patient data under your BAA.
              Production projects can&apos;t be self-served deleted. Deletion
              follows your BAA&apos;s return-or-destroy terms and is blocked
              while other projects or entities reference these patients.
            </p>
          </div>
          {requested ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Request received — our team will reach out to coordinate the
              return-or-destroy process.
            </p>
          ) : (
            <Button
              variant="outline"
              className="mt-3"
              onClick={() => setRequested(true)}
            >
              Request production deletion
            </Button>
          )}
        </div>
      ) : (
        // ---- Staging: self-serve delete behind a typed confirm --------------
        <div className="mt-3">
          <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
            This permanently deletes{' '}
            <span className="font-medium text-foreground">
              {currentProject.name}
            </span>{' '}
            and all its synthetic data. Staging holds no real patient data, so
            this is immediate.
          </p>
          <Button
            className="mt-4 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="h-4 w-4" data-icon="inline-start" />
            Delete project
          </Button>
        </div>
      )}

      <ConfirmDeleteModal
        open={confirmOpen}
        projectName={currentProject.name}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
      />
    </section>
  )
}

// Type-to-confirm delete dialog, matching the Clear-vault pattern.
function ConfirmDeleteModal({
  open,
  projectName,
  onClose,
  onConfirm,
}: {
  open: boolean
  projectName: string
  onClose: () => void
  onConfirm: () => void
}) {
  const [value, setValue] = useState('')
  const matches = value.trim() === projectName

  function handleClose() {
    setValue('')
    onClose()
  }

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault()
    if (!matches) return
    setValue('')
    onConfirm()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Delete project"
      description={`This permanently deletes ${projectName} and all its synthetic data. Staging holds no real patient data, so this is immediate.`}
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="delete-project-form"
            disabled={!matches}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete project
          </Button>
        </>
      }
    >
      <form id="delete-project-form" onSubmit={handleSubmit}>
        <Field
          label={`Type "${projectName}" to confirm`}
          htmlFor="delete-project-confirm"
        >
          <TextInput
            id="delete-project-confirm"
            autoFocus
            autoComplete="off"
            placeholder={projectName}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </Field>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">
          This cannot be undone. The project and its synthetic vault are removed
          immediately.
        </p>
      </form>
    </Modal>
  )
}
