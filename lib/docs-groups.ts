import type { DocNavItem } from '@/lib/docs-shared'

export const DOC_GROUP_ORDER = ['Store', 'Attach', 'Find', 'Platform'] as const

export type DocGroup = (typeof DOC_GROUP_ORDER)[number]

export const DOC_GROUP_ANCHORS: Record<Exclude<DocGroup, 'Platform'>, string> = {
  Store: 'store',
  Attach: 'attach',
  Find: 'find',
}

const GROUP_BY_TITLE: Record<string, DocGroup> = {
  Patients: 'Store',
  Patient: 'Store',
  Address: 'Store',
  Alias: 'Store',
  Contact: 'Store',
  Deceased: 'Store',
  'Deceased Record': 'Store',
  Identifier: 'Store',
  Attach: 'Attach',
  Find: 'Find',
  'Health Grid / Patient': 'Platform',
  'User / Myself': 'Platform',
  'Custom Fields': 'Platform',
}

export function isDocGroup(value: unknown): value is DocGroup {
  return typeof value === 'string' && DOC_GROUP_ORDER.includes(value as DocGroup)
}

export function resolveDocGroup(item: Pick<DocNavItem, 'title' | 'group'>): DocGroup {
  if (isDocGroup(item.group)) return item.group

  const leafTitle = item.title.split(' / ')[0]
  return GROUP_BY_TITLE[item.title] ?? GROUP_BY_TITLE[leafTitle] ?? 'Platform'
}

export function withResolvedDocGroup<T extends DocNavItem>(item: T): T & { group: DocGroup } {
  return { ...item, group: resolveDocGroup(item) }
}

export function groupDocNav(nav: DocNavItem[]): Array<{ group: DocGroup; items: DocNavItem[] }> {
  const grouped = new Map<DocGroup, DocNavItem[]>(
    DOC_GROUP_ORDER.map((group) => [group, []]),
  )

  nav.forEach((item) => grouped.get(resolveDocGroup(item))?.push(item))

  return DOC_GROUP_ORDER.map((group) => ({ group, items: grouped.get(group) ?? [] })).filter(
    ({ items }) => items.length > 0,
  )
}

export function landingHrefForGroup(group: DocGroup): string | null {
  if (group === 'Platform') return null
  return `/#${DOC_GROUP_ANCHORS[group]}`
}
