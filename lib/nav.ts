import { LayoutDashboard, Users, BookOpen, type LucideIcon } from 'lucide-react'

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
}

// Top quick-nav, rendered as a horizontal button row. Items are grouped; a
// visual separator is drawn between groups. Order (left → right):
//   Console  |  Patients · Documentation
// Console sits alone in the first group; everything else follows the separator.
export const QUICK_NAV: NavItem[][] = [
  [{ label: 'Console', href: '/console', icon: LayoutDashboard }],
  [
    { label: 'Patients', href: '/patients', icon: Users },
    { label: 'Documentation', href: '/documentation', icon: BookOpen },
  ],
]

export const ALL_NAV: NavItem[] = QUICK_NAV.flat()

export function sectionForPath(pathname: string): string {
  const match = ALL_NAV.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/'),
  )
  return match?.label ?? 'Console'
}
