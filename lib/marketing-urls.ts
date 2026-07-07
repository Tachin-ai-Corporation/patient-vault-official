// Canonical outbound CTA links for the public marketing surface. These point at
// the 1health-hosted Patient Vault sign-in / sign-up pages and must NOT route
// through this app's /auth launch flow. Consolidated here so nav.tsx, hero.tsx,
// and the public /baa page never drift.
export const LOGIN_URL =
  'https://1health.demo.1health.io/login?openApp=Patient%20Vault'
export const REGISTER_URL =
  'https://1health.demo.1health.io/register?openApp=Patient%20Vault'
