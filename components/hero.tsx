'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Parallax } from '@/components/parallax'
import { captureRef } from '@/lib/partner-ref'
import { withAuthParams } from '@/lib/auth-branding'
import { useTheme } from '@/components/theme-provider'

// brandingId + the active light/dark mode are appended per render.
const REGISTER_BASE = 'https://1health.demo.1health.io/register?openApp=Patient%20Vault'

const partnerMessages: Record<string, string> = {
  verge: 'Verge HealthTech sent you. Your $25,000 in Patient Vault credits will apply at signup.',
  'plug-and-play': 'Plug and Play sent you. Your $25,000 in Patient Vault credits will apply at signup.',
  hackathon: 'Hackathon credit applied. Your $25,000 in Patient Vault credits will apply at signup.',
}

export function Hero() {
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [partnerRef, setPartnerRef] = useState<string | null>(null)
  const { theme } = useTheme()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    // Persist the raw ref so it survives the multi-step signup navigation.
    // Validation against the partner map happens at user creation.
    captureRef(ref)
    if (ref && partnerMessages[ref]) {
      setPartnerRef(ref)
    }
  }, [])

  const showBanner = partnerRef && !bannerDismissed

  return (
    <>
      {/* Partner referral banner */}
      {showBanner && (
        <div
          className="relative flex items-center justify-center px-6 py-2.5 min-h-[40px]"
          style={{ backgroundColor: 'rgba(31, 154, 155, 0.15)' }}
        >
          <p className="text-[13px] text-center" style={{ color: 'var(--color-network-teal)' }}>
            {partnerMessages[partnerRef!]}
          </p>
          <button
            onClick={() => setBannerDismissed(true)}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:opacity-70 transition-opacity"
            aria-label="Dismiss banner"
          >
            <X size={14} style={{ color: 'var(--color-network-teal)' }} />
          </button>
        </div>
      )}

      <section
        aria-labelledby="hero-headline"
        className="relative bg-[--color-graphite] overflow-hidden pt-32 pb-24 px-6"
      >
        {/* Drifting grid backdrop (parallax) */}
        <Parallax
          speed={0.25}
          className="grid-backdrop absolute inset-x-0 -top-24 h-[140%] pointer-events-none"
        >
          {null}
        </Parallax>

        <div className="max-w-[1200px] mx-auto relative z-10">
          <h1
            id="hero-headline"
            className="font-sans font-bold text-[--color-cloud] leading-[1.0] tracking-[-0.025em] text-[56px] md:text-[72px] lg:text-[80px] mb-6 text-balance"
          >
            Patient Vault
          </h1>
          <section aria-labelledby="three-verbs-heading" className="mb-10">
            <h2
              id="three-verbs-heading"
              className="mb-6 font-sans text-2xl font-semibold tracking-tight text-[--color-cloud] text-balance md:text-3xl"
            >
              Three verbs. The whole record.
            </h2>

            <div className="grid gap-3 md:grid-cols-3">
              {[
                {
                  verb: 'STORE',
                  description:
                    'Create and list patient demographic records, with endpoints for addresses, contacts, aliases, external identifiers, and deceased status.',
                  href: '/documentation/patient',
                },
                {
                  verb: 'ATTACH',
                  description:
                    'Upload and list file attachments linked to a patient record, including consent forms and lab results.',
                  href: '/documentation/patient-patientid-attach',
                },
                {
                  verb: 'FIND',
                  description:
                    'Find patients by demographic criteria using exact or fuzzy matching.',
                  href: '/documentation/patient-find',
                },
              ].map((card) => (
                <a
                  key={card.verb}
                  href={card.href}
                  className="group flex min-h-64 flex-col rounded-[10px] border border-[--color-slate]/30 bg-[--color-charcoal]/60 p-6 transition-colors hover:border-[--color-network-teal]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-network-teal]"
                >
                  <h3 className="font-mono text-sm font-semibold tracking-[0.16em] text-[--color-network-teal]">
                    {card.verb}
                  </h3>
                  <p className="mt-5 text-base leading-relaxed text-[--color-mist] text-pretty">
                    {card.description}
                  </p>
                  <span className="mt-auto pt-6 text-sm font-semibold text-[--color-cloud] transition-colors group-hover:text-[--color-network-teal]">
                    View the endpoints →
                  </span>
                </a>
              ))}
            </div>
          </section>

          <div className="flex flex-col gap-3 mb-12">
            <div className="flex flex-wrap items-center gap-4">
              <a
                href={withAuthParams(REGISTER_BASE, theme)}
                className="flex items-center gap-2 px-5 py-3 rounded-[10px] text-sm font-semibold hover:opacity-90 transition-opacity duration-150"
                style={{
                  backgroundColor: showBanner ? 'var(--color-amber)' : 'var(--color-network-teal)',
                  color: 'var(--color-graphite)',
                  borderWidth: showBanner ? '2px' : '0',
                  borderColor: showBanner ? 'var(--color-amber)' : 'transparent',
                }}
              >
                Get Started
              </a>
            </div>
            <p className="text-[14px] text-[--color-slate]">
              Register for Patient Vault, get the reference app, and fork it on GitHub.
            </p>
          </div>

          {/* Trust bar - stat tiles */}
          <div className="border-t border-[--color-slate]/30 pt-8">
            <div className="flex flex-wrap gap-8 md:gap-0 md:divide-x md:divide-[--color-slate]/30">
              <div className="md:pr-8">
                <p className="font-sans text-3xl font-bold text-[--color-cloud] mb-1">80M</p>
                <p className="text-[13px] text-[--color-slate]">Americans served by apps on Patient Vault</p>
              </div>
              <div className="md:px-8">
                <p className="font-sans text-lg font-bold text-[--color-cloud] mb-1">SOC 2 Type II · HIPAA</p>
                <p className="text-[13px] text-[--color-slate]">BAA executed at production activation</p>
              </div>
              <div className="md:pl-8">
                <p className="font-sans text-3xl font-bold text-[--color-cloud] mb-1">30s</p>
                <p className="text-[13px] text-[--color-slate]">to your first authenticated call</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
