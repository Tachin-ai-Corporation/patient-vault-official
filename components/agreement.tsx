'use client'

import Link from 'next/link'

// The exact BAA text shown in the signup flow and available at /baa. Kept here
// so both the full-page signup agreement and the in-app environment
// registration modal render identical terms from one source.
export const BAA_VERSION = 'v1.0'

export const baaContent = `1HEALTH PLATFORM BUSINESS ASSOCIATE AGREEMENT

Version v1.0 · Effective: 2026

This Business Associate Agreement ("BAA") is entered into between:

For Covered Entities:
Covered Entity: [Covered Entity Name]
Business Associate: Tachin.ai, Inc., a Delaware Corporation ("1health Platform Owner")

For Non-Covered Entities:
Non-Covered Entity: [Non-Covered Entity Name] ("Service Provider")
Business Associate: Tachin.ai, Inc., a Delaware Corporation ("1health Platform Owner")

1. PURPOSE

This BAA ensures that the Covered Entity or Service Provider handles Protected Health Information ("PHI") in compliance with the Health Insurance Portability and Accountability Act of 1996 ("HIPAA") and the Health Information Technology for Economic and Clinical Health ("HITECH") Act of 2009.

2. DEFINITIONS

- PHI: Individually identifiable health information.
- Covered Entity: An entity subject to HIPAA regulations.
- Business Associate: 1health Platform Owner, providing services involving PHI.
- Service Provider: A Non-Covered Entity, whether directly contracted or sub-contracted, using 1health Platform to provide services to any Covered Entity.

3. OBLIGATIONS

For Covered Entities:
- Use and Disclosure: Business Associate shall use or disclose PHI only as permitted by this BAA or as required by law.
- Safeguards: Business Associate shall implement administrative, physical, and technical safeguards to protect PHI.
- Reporting: Business Associate shall report any use or disclosure of PHI not provided for by this BAA, including breaches of unsecured PHI.

For Non-Covered Entities:
- Use and Disclosure: The Service Provider shall use or disclose PHI only as permitted by this BAA or as required by law.
- Safeguards: The Service Provider shall implement administrative, physical, and technical safeguards to protect PHI.
- Reporting: The Service Provider shall report any use or disclosure of PHI not provided for by this BAA, including breaches of unsecured PHI.

4. PERMITTED USES AND DISCLOSURES

For Covered Entities:
- Services: Business Associate may use PHI to perform services outlined in the 1health Platform Terms of Use, which may be updated from time to time.
- Minimum Necessary: Business Associate shall make commercially reasonable efforts to limit use of PHI to the minimum necessary to accomplish the intended purpose.

For Non-Covered Entities:
- Services: The Service Provider may only use PHI to perform services outlined in its agreement(s) with Business Associate and/or Covered Entity, for the benefit of the Covered Entity.
- Minimum Necessary: The Service Provider shall limit use of PHI to the minimum necessary to accomplish the intended purpose.

5. TERMINATION

For Covered Entities:
- For Cause: If Business Associate violates a material term of this BAA, the Covered Entity may terminate this BAA.
- Effect of Termination: Upon termination, Business Associate shall disable all access to sensitive information by users, generated API keys, and interfaces deployed by the Covered Entity.

For Non-Covered Entities:
- For Cause: If the Service Provider violates a material term of this BAA, Business Associate may terminate this BAA.
- For Convenience: Business Associate may terminate this BAA upon notice to Service Provider in its sole discretion.
- Effect of Termination: Upon termination, Business Associate shall disable all access to sensitive information by users, generated API keys, and interfaces deployed by the Service Provider.

6. MISCELLANEOUS

- Amendments: This BAA may be amended only by a written agreement signed by both parties.
- Governing Law: This BAA shall be governed by the laws of the State of California.

Tachin.ai, Inc.`

// Render the BAA with the developer-entered organization name written into the
// agreement as the named Covered Entity, so acceptance is bound to the specific
// organization the developer is creating. Falls back to the neutral bracketed
// placeholder before the developer has typed a name.
export function baaContentFor(orgName: string): string {
  const entity = orgName.trim() || '[Covered Entity Name]'
  return baaContent.replace('[Covered Entity Name]', entity)
}

// Terms & Conditions and Privacy Policy live on the 1health platform; the BAA
// is served locally at /baa. These are the canonical links surfaced anywhere
// the combined agreement is presented.
const TERMS_URL = 'https://dev.1health.io/terms'
const PRIVACY_URL = 'https://dev.1health.io/privacy'
const BAA_URL = '/baa'

interface AgreementCheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  theme?: 'dark' | 'light'
}

// One required checkbox that accepts the BAA, Terms & Conditions, and Privacy
// Policy together, with each of the three individually linked. Shared by the
// signup agreement screen and the environment-registration modal so the two
// surfaces never diverge.
export function AgreementCheckbox({ checked, onChange, theme = 'dark' }: AgreementCheckboxProps) {
  const textColor = theme === 'dark' ? 'var(--color-mist)' : '#475569'
  const linkColor = 'var(--color-network-teal)'

  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-5 h-5 shrink-0 rounded accent-[var(--color-network-teal)]"
      />
      <span className="text-[14px] leading-relaxed" style={{ color: textColor }}>
        {'I accept the '}
        <Link href={BAA_URL} target="_blank" style={{ color: linkColor }} className="hover:opacity-80">
          Business Associate Agreement
        </Link>
        {', '}
        <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" style={{ color: linkColor }} className="hover:opacity-80">
          Terms &amp; Conditions
        </a>
        {', and '}
        <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" style={{ color: linkColor }} className="hover:opacity-80">
          Privacy Policy
        </a>
        {', and agree to be bound by their terms.'}
      </span>
    </label>
  )
}
