'use client'

import { ThemeToggle } from '@/components/theme-toggle'
import { UserMenu } from '@/components/user-menu'

// Utility row of the top chrome: the app brand on the left, account controls
// on the right. There is one implicit vault per account, so no vault selector,
// environment toggle, credits, or partner badge live here. The quick-nav
// button row (TopNav) renders directly beneath this.
export function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/80 px-6 backdrop-blur-md">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-tag bg-teal font-mono text-sm font-semibold text-[#202833]">
          1h
        </span>
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Patient Vault
        </span>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  )
}
