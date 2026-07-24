'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/session-context'
import { signOut } from '@/lib/auth-client'
import { cn } from '@/lib/utils'

// When we learn the exact URL the 1health platform uses to end its own SSO
// session (capture it from the 1health app's own "log out" button in the
// Network tab), set it here to also log the user out of 1health on sign out.
// Until then, sign out is app-only and lands on our /auth screen.
const PLATFORM_LOGOUT_URL: string | null = null

export function UserMenu() {
  const { session } = useSession()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  async function handleSelect(label: string) {
    setOpen(false)
    if (label === 'Console') {
      router.push('/console')
      return
    }
    if (label === 'Sign out') {
      // Clear THIS app's session (cookies + storage, incl. the server
      // /api/logout route for parent-domain/HttpOnly cookies), then hard-reload
      // to our own /auth screen. This is a reliable app-only logout.
      //
      // NOTE: This does NOT end the 1health *platform* SSO session, so a
      // relaunch from 1health can still auto-authenticate. Every attempt to end
      // the platform session from here has failed (the guessed logout URLs 404 /
      // 400 / 401), so we need the exact logout URL the 1health app itself uses
      // before wiring platform logout back in. See PLATFORM_LOGOUT_URL below.
      await signOut()

      if (PLATFORM_LOGOUT_URL) {
        window.location.assign(PLATFORM_LOGOUT_URL)
      } else {
        window.location.assign('/auth')
      }
    }
  }

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
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-trust-blue font-mono text-xs font-semibold text-[#e6ebf0] transition-all duration-150 ease-[var(--ease-fluid)] hover:shadow-[0_0_0_3px_color-mix(in_srgb,var(--aqua)_22%,transparent)]"
      >
        {session.user.initials}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-card border border-border bg-popover p-1 shadow-xl"
        >
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-medium text-popover-foreground">
              {session.user.name}
            </p>
            <p className="truncate font-mono text-[11px] text-muted-foreground">
              {session.user.email}
            </p>
          </div>
          <div className="h-px bg-border" />
          {['Console', 'Sign out'].map((label) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              onClick={() => handleSelect(label)}
              className={cn(
                'flex w-full items-center rounded-input px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-accent/15',
                label === 'Sign out'
                  ? 'text-destructive'
                  : 'text-muted-foreground hover:text-popover-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
