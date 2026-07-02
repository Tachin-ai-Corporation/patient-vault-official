'use client'

import { useState } from 'react'
import { FolderPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProjectCreateDialog } from '@/components/project-create-dialog'

// Safe state shown when the session has no projects (e.g. right after deleting
// the last one). Replaces the console chrome so nothing reads a dangling
// currentProjectId, and offers the single next step: create a project.
export function ProjectOnboarding() {
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="flex max-w-md flex-col items-center text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-card bg-muted text-muted-foreground">
          <FolderPlus className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-xl font-semibold tracking-tight text-foreground text-balance">
          No projects yet
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
          A project is an isolated vault for one integration. Create one to get
          a staging environment with synthetic test data — no real patient data
          until you complete the production checkpoint.
        </p>
        <Button
          className="mt-6 bg-primary text-primary-foreground"
          onClick={() => setCreateOpen(true)}
        >
          <FolderPlus className="h-4 w-4" data-icon="inline-start" />
          Create project
        </Button>
      </div>

      <ProjectCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </main>
  )
}
