'use client'

import { useApiInspector } from '@/lib/api-inspector'

// Console control for the API-call viewer. The viewer surfaces the PV API
// request behind each Patients action as a non-blocking, dismissible panel.
// This toggle turns the whole viewer on/off globally; it defaults on.
export function InspectorToggle() {
  const { enabled, setEnabled } = useApiInspector()

  return (
    <section className="rounded-card border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">
            API-call viewer
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground text-pretty">
            Surfaces the PV API request behind each action in the Patients table
            (create, edit, delete, seed, search, custom fields) as a dismissible,
            non-blocking panel. A learning aid only &mdash; it never gates an
            action, and nothing is logged or persisted.
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Toggle API-call viewer"
          onClick={() => setEnabled(!enabled)}
          className={[
            'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
            enabled ? 'bg-primary' : 'bg-muted',
          ].join(' ')}
        >
          <span
            className={[
              'inline-block h-5 w-5 transform rounded-full bg-background shadow transition-transform',
              enabled ? 'translate-x-5' : 'translate-x-0.5',
            ].join(' ')}
          />
        </button>
      </div>

      <p className="mt-3 font-mono text-xs text-muted-foreground">
        {enabled ? 'On' : 'Off'} &middot; default on
      </p>
    </section>
  )
}
