'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { useSession } from '@/lib/session-context'
import { ProjectCreateDialog } from '@/components/project-create-dialog'
import { cn } from '@/lib/utils'

export function ProjectSwitcher() {
  const { session, currentProject, setCurrentProjectId } = useSession()
  const [open, setOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center gap-2 rounded-button border border-sidebar-border bg-sidebar-accent/40 px-2.5 py-2 text-left transition-all duration-150 ease-[var(--ease-fluid)]',
          'hover:border-aqua/50 hover:shadow-[0_0_0_3px_color-mix(in_srgb,var(--aqua)_18%,transparent)]',
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-tag bg-teal font-mono text-sm font-semibold text-[#202833]">
          1h
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-sidebar-foreground">
            {currentProject.name}
          </span>
          <span className="block font-mono text-[11px] text-muted-foreground">
            {currentProject.id}
          </span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-card border border-sidebar-border bg-popover p-1 shadow-xl"
        >
          <p className="px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Projects
          </p>
          {session.projects.map((project) => {
            const active = project.id === currentProject.id
            return (
              <button
                key={project.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  setCurrentProjectId(project.id)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-input px-2.5 py-2 text-left text-sm transition-colors duration-150',
                  'hover:bg-sidebar-accent',
                  active
                    ? 'text-popover-foreground'
                    : 'text-muted-foreground hover:text-popover-foreground',
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {project.name}
                  </span>
                  <span className="block font-mono text-[11px] text-muted-foreground">
                    {project.id}
                  </span>
                </span>
                {active && <Check className="h-4 w-4 shrink-0 text-teal" />}
              </button>
            )
          })}
          <div className="my-1 h-px bg-sidebar-border" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              setCreateOpen(true)
            }}
            className="flex w-full items-center gap-2 rounded-input px-2.5 py-2 text-left text-sm text-muted-foreground transition-colors duration-150 hover:bg-sidebar-accent hover:text-popover-foreground"
          >
            <Plus className="h-4 w-4 shrink-0" />
            Create project
          </button>
        </div>
      )}

      <ProjectCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  )
}
