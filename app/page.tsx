import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { LandingHeader } from '@/components/landing-header'
import { connectedSessionEnvironment } from '@/lib/session-environments'
import { Hero } from '@/components/hero'
import { WhoThisIsFor } from '@/components/who-this-is-for'
import { WhatItReplaces } from '@/components/what-it-replaces'
import { HowItComposes } from '@/components/how-it-composes'
import { WhatsInIt } from '@/components/whats-in-it'
import { Quickstart } from '@/components/quickstart'
import { Editorial } from '@/components/editorial'
import { Pricing } from '@/components/pricing'
import { Incubator } from '@/components/incubator'
import { HowWeReachYou } from '@/components/how-we-reach-you'
import { Faq, faqs } from '@/components/faq'
import { ForAgents } from '@/components/for-agents'
import { Footer } from '@/components/footer'
import { Parallax } from '@/components/parallax'
import { SessionLoginRedirect } from '@/components/session-login-redirect'
import { validateLoginIntent } from '@/lib/login-intent'
import type { Metadata } from 'next'

const PAGE_TITLE = 'Patient Vault — The patient database for your healthcare app'
const PAGE_DESCRIPTION =
  'The patient database for your healthcare app. SOC 2 Type II, HIPAA — BAA executed at production activation. Free to start.'

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: 'https://pv.1health.io' },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: 'https://pv.1health.io',
    siteName: '1health',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
}

const jsonLdSoftwareApp = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Patient Vault',
  applicationCategory: 'HealthApplication',
  operatingSystem: 'Web',
  url: 'https://pv.1health.io',
  description:
    'The patient database for your healthcare app. SOC 2 Type II, HIPAA — BAA executed at production activation. Free to start.',
  author: {
    '@type': 'Organization',
    name: '1health',
    url: 'https://dev.1health.io',
  },
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: 'Free for your first 1,000 patients. $1/patient/year after that.',
  },
}

const jsonLdFaq = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: {
      '@type': 'Answer',
      text: f.a,
    },
  })),
}

const jsonLdArticle = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Six rules for a modern patient record API',
  description:
    'Six design decisions, learned in production, that determine whether your patient record scales, complies, and survives.',
  author: {
    '@type': 'Person',
    name: 'Neil Sethi',
    jobTitle: 'Platform Development',
    worksFor: { '@type': 'Organization', name: '1health' },
  },
  publisher: {
    '@type': 'Organization',
    name: '1health',
    url: 'https://dev.1health.io',
  },
}

export default async function PatientVaultPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; lpl?: string }>
}) {
  // Either environment slot is sufficient to enter the console. The client
  // session provider validates expiry and falls back to the other valid slot.
  const [cookieStore, params] = await Promise.all([cookies(), searchParams])
  const initialEnvironment = connectedSessionEnvironment(
    (name) => cookieStore.get(name)?.value ?? null,
  )

  // 1health's registration/login flow redirects back to this root route with a
  // one-time launch payload (`?lpl=`) rather than to `/auth`. Hand it off to the
  // /auth route, which decrypts the payload, sets the session cookies, and drops
  // the developer into the authenticated console. `+` characters in the token
  // are re-encoded so they survive the redirect instead of decoding to spaces.
  const lpl = typeof params.lpl === 'string' ? params.lpl.trim() : ''
  if (!initialEnvironment && lpl) {
    redirect(`/auth?lpl=${encodeURIComponent(lpl.replace(/ /g, '+'))}`)
  }

  const returnTo = validateLoginIntent(params.returnTo)
  if (!initialEnvironment && returnTo) {
    return <SessionLoginRedirect returnTo={returnTo} />
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSoftwareApp) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdArticle) }}
      />
      <LandingHeader initialEnvironment={initialEnvironment} />
      <main>
        <Hero />
        <Parallax reveal translate={false}><WhoThisIsFor /></Parallax>
        <Parallax reveal translate={false}><WhatItReplaces /></Parallax>
        <Parallax reveal translate={false}><HowItComposes /></Parallax>
        <Parallax reveal translate={false}><WhatsInIt /></Parallax>
        <Parallax reveal translate={false}><Quickstart /></Parallax>
        <Parallax reveal translate={false}><Editorial /></Parallax>
        <Parallax reveal translate={false}><Pricing /></Parallax>
        <Parallax reveal translate={false}><Incubator /></Parallax>
        <Parallax reveal translate={false}><HowWeReachYou /></Parallax>
        <Parallax reveal translate={false}><Faq /></Parallax>
        <Parallax reveal translate={false}><ForAgents /></Parallax>
      </main>
      <Footer />
    </>
  )
}
