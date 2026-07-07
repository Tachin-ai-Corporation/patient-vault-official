'use client'

import { partnerCredits } from '@/lib/partner-ref'

interface PartnerBannerProps {
  refParam: string | null
}

export function PartnerBanner({ refParam }: PartnerBannerProps) {
  if (!refParam || !partnerCredits[refParam]) return null

  const partner = partnerCredits[refParam]

  return (
    <div
      className="flex items-center justify-center px-6 py-2.5 min-h-[40px]"
      style={{ backgroundColor: 'rgba(31, 154, 155, 0.15)' }}
    >
      <p className="text-[13px] text-center" style={{ color: 'var(--color-network-teal)' }}>
        ${partner.credit.toLocaleString()} in credits will apply at signup, courtesy of {partner.name}.
      </p>
    </div>
  )
}
