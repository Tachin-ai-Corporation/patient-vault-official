'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/session-context'
import { getPlatformLogoutUrl, signOut } from '@/lib/auth-client'
import { cn } from '@/lib/utils'

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
      // Resolve the 1health platform logout URL BEFORE clearing cookies (it
      // reads onehealth_environment).
      const platformLogoutUrl = getPlatformLogoutUrl()

      // 1. Clear THIS app's session (cookies + storage, incl. the server
      //    /api/logout route for parent-domain/HttpOnly cookies).
      await signOut()

      // 2. TOP-LEVEL navigate to the 1health platform's own /logout route — the
      //    same one their web app's "log out" button uses. This ends the SSO
      //    session (which was silently re-launching this app) and lands on the
      //    platform login page. A top-level navigation is required so the
      //    browser processes the session-clearing Set-Cookie; a background fetch
      //    can't reliably clear the platform's SameSite/HttpOnly cookie.
      window.location.assign(platformLogoutUrl)
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
