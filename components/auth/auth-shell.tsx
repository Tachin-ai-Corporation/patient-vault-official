'use client'

import type { CSSProperties, ReactNode } from 'react'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  resolveBranding,
  type AuthBranding,
} from '@/lib/auth-branding'

// Calm, centered, branded wrapper for the public auth pages — landing-page
// feel rather than dense console chrome. Shared by /login and /register.
//
// `branding` is optional; when omitted the screen renders with the current
// 1health styling. When a developer supplies overrides, the accent color is
// published as `--auth-accent` so nested controls can opt into it.
export function AuthShell({
  children,
  branding,
}: {
  children: ReactNode
  branding?: Partial<AuthBranding> | null
}) {
  const b = resolveBranding(branding)
  const style = { '--auth-accent': b.accentColor } as CSSProperties

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12"
      style={style}
    >
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <div className="rounded-card border border-border bg-card p-8 shadow-xl">
          {children}
        </div>
      </div>
    </div>
  )
}

// The brand mark + product title + positioning line, used atop both auth pages.
// Falls back to 1health styling when no branding is supplied.
export function AuthBrand({
  subtitle,
  branding,
}: {
  subtitle?: string
  branding?: Partial<AuthBranding> | null
}) {
  const b = resolveBranding(branding)

  return (
    <div className="flex flex-col items-center text-center">
      {b.logoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={b.logoSrc || "/placeholder.svg"}
          alt={b.logoAlt ?? `${b.title} logo`}
          className="h-11 w-auto"
        />
      ) : (
        <div
          className="flex h-11 w-11 items-center justify-center rounded-button font-mono text-base font-bold"
          style={{ backgroundColor: b.brandColor, color: b.onBrandColor }}
        >
          {b.logoText}
        </div>
      )}
      <h1 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
        {b.title}
      </h1>
      <p className="mt-1.5 text-sm font-medium text-foreground text-balance">
        {b.tagline}
      </p>
      <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-muted-foreground text-pretty">
        {subtitle ??
          'Free to start with synthetic data — no BAA required until you go to production.'}
      </p>
    </div>
  )
}
