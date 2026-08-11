import { cookies } from 'next/headers'
import { LandingHeader } from '@/components/landing-header'
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

export default async function PatientVaultPage() {
  // Either environment slot is sufficient to enter the console. The client
  // session provider validates expiry and falls back to the other valid slot.
  const cookieStore = await cookies()
  const hasSession = Boolean(
    cookieStore.get('demo_access_token')?.value ||
      cookieStore.get('prod_access_token')?.value ||
      cookieStore.get('access_token')?.value,
  )
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
      <LandingHeader authenticated={hasSession} />
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
