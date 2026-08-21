import { ConsoleView } from '@/components/console/console-view'

export default async function ConsolePage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const { returnTo } = await searchParams
  return <ConsoleView returnTo={returnTo} />
}
