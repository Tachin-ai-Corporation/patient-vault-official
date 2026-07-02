'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Field, TextInput } from '@/components/ui/field'
import { useSession } from '@/lib/session-context'

// Small dialog behind the switcher's (and onboarding's) "Create project"
// action. A new project is just a named staging vault — one field, no options.
export function ProjectCreateDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { createProject } = useSession()
  const router = useRouter()
  const [name, setName] = useState('')
  const trimmed = name.trim()

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault()
    if (!trimmed) return
    createProject(trimmed)
    setName('')
    onClose()
    // New project is the current project now; land on its empty patients grid.
    router.push('/patients')
  }

  function handleClose() {
    setName('')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create project"
      description="A project is an isolated vault for one integration. New projects always start in staging."
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-project-form"
            disabled={!trimmed}
            className="bg-primary text-primary-foreground"
          >
            Create project
          </Button>
        </>
      }
    >
      <form id="create-project-form" onSubmit={handleSubmit}>
        <Field label="Project name" htmlFor="new-project-name">
          <TextInput
            id="new-project-name"
            autoFocus
            placeholder="e.g. Lakeside Pediatrics"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={!trimmed && name.length > 0}
          />
          {!trimmed && name.length > 0 && (
            <p className="mt-1 text-xs text-destructive">
              Project name cannot be empty.
            </p>
          )}
        </Field>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">
          Starts as an empty staging vault — synthetic test data only, no real
          patient data until you complete the production checkpoint.
        </p>
      </form>
    </Modal>
  )
}
