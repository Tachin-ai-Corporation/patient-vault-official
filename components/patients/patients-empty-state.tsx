'use client'

import { Database, List, Plus, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

type PatientsEmptyStateProps = {
  projectName: string
  onSeed: () => void
  onAdd: () => void
  onList: () => void
  listing: boolean
}

export function PatientsEmptyState({
  projectName,
  onSeed,
  onAdd,
  onList,
  listing,
}: PatientsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-card/50 px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-card bg-muted text-muted-foreground">
        <Database className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground text-balance">
        The vault is empty
      </h3>
      <p className="mt-2 max-w-md leading-relaxed text-muted-foreground text-pretty">
        {projectName} has no patient records yet. You need records to build and
        test against — every patient becomes a bounded API resource you can read
        and write. Seed a set of realistic synthetic patients to get moving, or
        add one yourself.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={onSeed} className="bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" data-icon="inline-start" />
          Seed sample data
        </Button>
        <Button variant="outline" onClick={onAdd}>
          <Plus className="h-4 w-4" data-icon="inline-start" />
          Add patient
        </Button>
        <Button variant="outline" onClick={onList} disabled={listing}>
          <List className="h-4 w-4" data-icon="inline-start" />
          {listing ? 'Listing…' : 'GET /v3/patient'}
        </Button>
      </div>
    </div>
  )
}
