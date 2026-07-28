'use client'

import type { CSSProperties, ReactNode } from 'react'
import { useTheme } from '@/components/theme-provider'
import { withAuthParams } from '@/lib/auth-branding'

// brandingId + the active light/dark mode are appended per render.
const REGISTER_BASE =
  'https://1health.demo.1health.io/register?openApp=Patient%20Vault'

/**
 * "Get Started" link to the hosted 1health registration screen.
 *
 * Exists as a client component so it can read the active theme via `useTheme()`
 * and forward `mode=light|dark`. Server components (e.g. the public BAA page)
 * can't call hooks, so they render this instead of a bare <a>.
 */
export function RegisterLink({
  className,
  style,
  children = 'Get Started',
}: {
  className?: string
  style?: CSSProperties
  children?: ReactNode
}) {
  const { theme } = useTheme()

  return (
    <a href={withAuthParams(REGISTER_BASE, theme)} className={className} style={style}>
      {children}
    </a>
  )
}
