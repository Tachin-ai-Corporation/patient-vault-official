'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { EnvironmentSelector } from '@/components/environment-selector'
import { ThemeToggle } from '@/components/theme-toggle'
import { UserMenu } from '@/components/user-menu'
import { useTheme } from '@/components/theme-provider'
import { withAuthParams } from '@/lib/auth-branding'
import { cn } from '@/lib/utils'

const REGISTER_BASE = 'https://pv.demo.1health.io/register?openApp=Patient%20Vault'
const LOGIN_BASE = 'https://pv.demo.1health.io/login?openApp=Patient%20Vault'

function BrandMark() {
  return (
    <>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-tag bg-teal font-mono text-sm font-semibold text-[#202833]">
        1h
      </span>
      <span className="whitespace-nowrap text-sm font-semibold tracking-tight text-foreground">
        Patient Vault
      </span>
    </>
  )
}

function HeaderLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const active = href.startsWith('/') && href !== '/' && pathname.startsWith(href)

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'shrink-0 rounded-button px-2.5 py-2 text-sm font-medium transition-colors',
        active ? 'bg-teal/10 text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {children}
    </Link>
  )
}

function PublicActions() {
  const { theme } = useTheme()
  const loginUrl = withAuthParams(LOGIN_BASE, theme)
  const registerUrl = withAuthParams(REGISTER_BASE, theme)

  return (
    <>
      <a href={loginUrl} className="shrink-0 px-1 text-sm font-medium text-muted-foreground hover:text-foreground">
        Sign in
      </a>
      <a
        href={registerUrl}
        className="inline-flex h-9 shrink-0 items-center rounded-button bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        Get Started
      </a>
    </>
  )
}

export function SharedHeader({ authenticated = false }: { authenticated?: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-2 px-4 sm:gap-3 sm:px-6">
        {authenticated ? (
          <EnvironmentSelector brand />
        ) : (
          <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Patient Vault home">
            <BrandMark />
          </Link>
        )}

        <nav aria-label="Primary navigation" className="flex shrink-0 items-center gap-0.5">
          <HeaderLink href="/documentation">Docs</HeaderLink>
          {authenticated ? (
            <>
              <HeaderLink href="/console">Console</HeaderLink>
              <HeaderLink href="/patients">Patients</HeaderLink>
            </>
          ) : (
            <>
              <HeaderLink href="/#pricing">Pricing</HeaderLink>
              <HeaderLink href="/#faq">FAQ</HeaderLink>
            </>
          )}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 pl-2">
          <ThemeToggle />
          {authenticated ? <UserMenu /> : <PublicActions />}
        </div>
      </div>
    </header>
  )
}
