import { redirect } from 'next/navigation'
import { getDefaultSlug } from '@/lib/docs'

// The Documentation tab defaults to the first resource in the manifest.
export default function DocumentationPage() {
  redirect(`/documentation/${getDefaultSlug()}`)
}
