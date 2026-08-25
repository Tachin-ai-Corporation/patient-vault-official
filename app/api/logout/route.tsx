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
 * domain-scope × partition-variant so no variant can survive.
 */

const SESSION_FIELDS = [
  "access_token",
  "refresh_token",
  "token_expires_at",
  "refresh_token_expires_at",
  "user_org_id",
  "user_id",
] as const
const SESSION_COOKIES = [
  "active_environment",
  "onehealth_base_url",
  "onehealth_environment",
  ...SESSION_FIELDS,
  ...(["demo", "prod"] as const).flatMap((env) =>
    SESSION_FIELDS.map((field) => `${env}_${field}`),
  ),
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

const EXPIRED = "Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT"

function buildExpiredCookies(host: string, secure: boolean): string[] {
  const domains = domainVariants(host)

  // Cookie identity is determined by name, domain, and path. SameSite and Secure
  // do not create separate cookie identities, so one expiry per domain is enough.
  // Keeping this compact also prevents the logout response from exceeding proxy
  // header limits, which previously caused the browser's /api/logout request to fail.
  const attributes = secure ? "SameSite=None; Secure" : "SameSite=Lax"

  const cookies: string[] = []
  for (const name of SESSION_COOKIES) {
    for (const domain of domains) {
      const domainPart = domain ? `; Domain=${domain}` : ""
      cookies.push(`${name}=; ${EXPIRED}${domainPart}; ${attributes}`)
    }
  }
  return cookies
}

/** Read a single cookie value from the incoming request's Cookie header. */
function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie")
  if (!header) return null
  const match = header.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * Server-authoritative platform logout. Forwards the caller's access token (and
 * Cookie header) to `POST {API_ROOT}/auth/user/logout/all-devices` so every
 * 1health server-side session/token is invalidated. This runs server-to-server, so it is
 * immune to the browser CORS restrictions that can block the client's own
 * credentialed cross-origin call. Best-effort: any failure is logged and
 * swallowed so the cookie-clearing response is never affected.
 */
async function platformLogout(req: Request, env: "demo" | "prod"): Promise<void> {
  try {
    const activeEnvironment = readCookie(req, "active_environment")
    const accessToken = readCookie(req, `${env}_access_token`)
      ?? (activeEnvironment === env ? readCookie(req, "access_token") : null)
    if (!accessToken) return

    const root = env === "demo"
      ? "https://1health.demo.1health.io"
      : "https://1health.app.1health.io"
    const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` }
    const logoutUrl = `${root}/auth/user/logout/all-devices`

    const res = await fetch(logoutUrl, {
      method: "POST",
      headers,
      cache: "no-store",
    })
    if (!res.ok && res.status !== 401) {
      console.error(`[v0] Global logout failed for ${env}: ${res.status}`)
    }
  } catch (error) {
    console.error(`[v0] Global logout request failed for ${env}:`, error)
  }
}

async function handle(req: Request): Promise<NextResponse> {
  // Invalidate the server-side platform session first, while the forwarded
  // access token is still valid. Best-effort — never blocks the cookie clear.
  await Promise.allSettled([
    platformLogout(req, "demo"),
    platformLogout(req, "prod"),
  ])

  const host = req.headers.get("host") ?? ""
  // Derive the protocol from the forwarded header — behind Vercel's proxy the
  // internal request URL is not reliably https, and `Secure` must be accurate
  // because it is required for both SameSite=None and Partitioned.
  const secure = (req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", ""))
    .split(",")[0]
    .trim() === "https"

  const res = NextResponse.json({ ok: true })
  for (const cookie of buildExpiredCookies(host, secure)) {
    res.headers.append("Set-Cookie", cookie)
  }
  // Never let this response (or the navigation that follows it) be served from
  // any cache, so the cleared-cookie state is always authoritative.
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate")
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
