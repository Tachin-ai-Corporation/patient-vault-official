'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { QUICK_NAV, type NavItem } from '@/lib/nav'
import { cn } from '@/lib/utils'

function NavButton({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group inline-flex items-center gap-2 rounded-button border px-3 py-1.5 text-sm transition-all duration-150 ease-[var(--ease-fluid)]',
        active
          ? 'border-teal/40 bg-teal/10 font-medium text-foreground'
          : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <Icon
        className={cn(
          'h-[18px] w-[18px] shrink-0',
          active
            ? 'text-teal'
            : 'text-muted-foreground group-hover:text-foreground',
        )}
      />
      {item.label}
    </Link>
  )
}

// Horizontal quick-nav button row that replaces the former left sidebar.
export function TopNav() {
  const pathname = usePathname()
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  return (
    <nav
      aria-label="Primary"
      className="sticky top-16 z-20 flex items-center gap-1.5 border-b border-border bg-background/80 px-6 py-2 backdrop-blur-md"
    >
      {QUICK_NAV.map((group, groupIndex) => (
        <Fragment key={groupIndex}>
          {groupIndex > 0 && (
            <span
              aria-hidden
              className="mx-1.5 h-5 w-px shrink-0 bg-border"
            />
          )}
          {group.map((item) => (
            <NavButton
              key={item.href}
              item={item}
              active={isActive(item.href)}
            />
          ))}
        </Fragment>
      ))}
    </nav>
  )
}
