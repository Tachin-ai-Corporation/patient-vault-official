'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

// Capability-flag gate. Certain planned-feature panes render ONLY when the app
// is entered with a matching ?preview=<code> flag:
//   • ?preview=1.1  → Providers pane
// Multiple flags can be combined with a comma (e.g. ?preview=1.1).
//
// The value is captured from the URL once on mount of this provider, which
// lives at the root layout and so is never unmounted by client-side navigation
// — meaning the gate persists across in-app navigation (e.g. clicking from the
// list into a patient, even if that route drops the query string). A deep link
// like /patients/pat_xxx?preview=1.1 opens it on load. A fresh load of any URL
// without the param — or with an unrecognized value — shows the standard
// Patient Vault, with no gated panes and no hint that a hidden mode exists.
//
// These flags ONLY control feature visibility. They do NOT set or imply
// pricing, entitlements, or credits.

const PREVIEW_PARAM = 'preview'
const PROVIDERS_CODE = '1.1'

const PreviewGateContext = createContext<ReadonlySet<string>>(new Set())

export function DcpGateProvider({ children }: { children: ReactNode }) {
  // Start with no flags on both server and first client render to avoid
  // hydration mismatch; resolve the real value in an effect after mount.
  const [codes, setCodes] = useState<ReadonlySet<string>>(new Set())

  useEffect(() => {
    try {
      const param = new URLSearchParams(window.location.search).get(
        PREVIEW_PARAM,
      )
      if (param) {
        const parsed = param
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean)
        if (parsed.length) setCodes(new Set(parsed))
      }
    } catch {
      // window unavailable — stay closed.
    }
  }, [])

  return (
    <PreviewGateContext.Provider value={codes}>
      {children}
    </PreviewGateContext.Provider>
  )
}

// Returns true only when the ?preview=1.1 capability gate is open (Providers
// pane).
export function useProvidersGate(): boolean {
  return useContext(PreviewGateContext).has(PROVIDERS_CODE)
}
