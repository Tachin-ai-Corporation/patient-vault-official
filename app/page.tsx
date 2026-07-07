import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Nav } from '@/components/nav'
import { PlatformBar } from '@/components/platform-bar'
import { AgentStrip } from '@/components/agent-strip'
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

const jsonLdSoftwareApp = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Patient Vault',
  applicationCategory: 'HealthApplication',
  operatingSystem: 'Web',
  url: 'https://dev.1health.io/patient-vault',
  description:
    'The patient database for your healthcare app. SOC 2 Type II, HIPAA — BAA executed at signup. Free to start.',
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
  // Preserve prior behavior: authenticated visitors land in the console, not the
  // public marketing page. Detected via the non-httpOnly access_token cookie set
  // during the OAuth exchange — no API call and no auth logic touched here.
  const token = (await cookies()).get('access_token')?.value
  if (token) {
    redirect('/patients')
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
      <PlatformBar />
      <AgentStrip />
      <Nav />
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
