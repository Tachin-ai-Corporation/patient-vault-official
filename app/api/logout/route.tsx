// app/api/logout/route.ts
import { NextResponse } from "next/server"

/**
 * POST /api/logout
 *
 * Fully clears the 1health session cookies from the SERVER side.
 *
 * WHY A SERVER ROUTE (and not just client-side document.cookie deletion):
 * the session cookies (access_token, refresh_token, …) can be written scoped to
 * the *parent* domain (e.g. `.1health.io`) during the 1health launch, and may be
 * marked HttpOnly. Client JavaScript on pv.1health.io can neither see HttpOnly
 * cookies nor reliably delete a parent-domain cookie — so a stale access_token
 * survived sign-out and silently re-authenticated the user on the next visit.
 *
 * This route runs on pv.1health.io, which is within `.1health.io`, so it is
 * allowed to expire cookies on both the host-only scope AND the parent-domain
 * scope, including HttpOnly ones. We emit an explicit Set-Cookie per cookie ×
 * domain-scope so no variant can survive.
 */

const SESSION_COOKIES = [
  "access_token",
  "refresh_token",
  "token_expires_at",
  "refresh_token_expires_at",
  "onehealth_base_url",
  "onehealth_environment",
  "user_org_id",
  "user_id",
] as const

/**
 * Builds the set of Domain attribute variants to expire a cookie under, derived
 * from the request host. For `pv.1health.io` this yields:
 *   - "" (host-only, no Domain attribute)
 *   - "pv.1health.io" (explicit host)
 *   - ".1health.io" (registrable parent domain)
 */
function domainVariants(host: string): string[] {
  const bare = host.split(":")[0] // strip any port
  const variants = new Set<string>([""]) // host-only
  if (bare && !/^[\d.]+$/.test(bare)) {
    variants.add(bare)
    const labels = bare.split(".")
    // Add progressively broader parent domains (e.g. .1health.io) so a cookie
    // set on any ancestor domain is covered.
    for (let i = 1; i < labels.length - 1; i++) {
      variants.add("." + labels.slice(i).join("."))
    }
  }
  return [...variants]
}

function buildExpiredCookies(host: string, secure: boolean): string[] {
  const domains = domainVariants(host)
  const expiredAttrs = "Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax"
  const cookies: string[] = []
  for (const name of SESSION_COOKIES) {
    for (const domain of domains) {
      const domainPart = domain ? `; Domain=${domain}` : ""
      const securePart = secure ? "; Secure" : ""
      cookies.push(`${name}=${domainPart ? "" : ""}; ${expiredAttrs}${domainPart}${securePart}`)
    }
  }
  return cookies
}

function handle(req: Request): NextResponse {
  const host = req.headers.get("host") ?? ""
  const secure = new URL(req.url).protocol === "https:"

  const res = NextResponse.json({ ok: true })
  for (const cookie of buildExpiredCookies(host, secure)) {
    res.headers.append("Set-Cookie", cookie)
  }
  return res
}

export async function POST(req: Request) {
  return handle(req)
}

// Allow GET as well so the browser can be hard-navigated straight to this route
// if ever needed (e.g. window.location = "/api/logout").
export async function GET(req: Request) {
  return handle(req)
}
