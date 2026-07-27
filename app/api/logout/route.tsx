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

const EXPIRED = "Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT"

function buildExpiredCookies(host: string, secure: boolean): string[] {
  const domains = domainVariants(host)

  // A partitioned (CHIPS) cookie lives in a different jar than an unpartitioned
  // one, and an expiring Set-Cookie only matches a cookie with the same
  // partition attribute. Session cookies are now written as
  // `SameSite=None; Secure; Partitioned`, so we must emit BOTH forms — the
  // partitioned one to clear current cookies, and the legacy `Lax` one to clear
  // any cookie written before this change. Omitting either silently breaks
  // sign-out.
  const variants = secure
    ? ["SameSite=None; Secure; Partitioned", "SameSite=None; Secure", "SameSite=Lax; Secure"]
    : ["SameSite=Lax"]

  const cookies: string[] = []
  for (const name of SESSION_COOKIES) {
    for (const domain of domains) {
      const domainPart = domain ? `; Domain=${domain}` : ""
      for (const variant of variants) {
        cookies.push(`${name}=; ${EXPIRED}${domainPart}; ${variant}`)
      }
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
 * Cookie header) to `POST {OAUTH_ROOT}/auth/user/logout` so the 1health
 * server-side session/token is invalidated. This runs server-to-server, so it is
 * immune to the browser CORS restrictions that can block the client's own
 * credentialed cross-origin call. Best-effort: any failure is logged and
 * swallowed so the cookie-clearing response is never affected.
 */
async function platformLogout(req: Request): Promise<void> {
  try {
    const accessToken = readCookie(req, "access_token")
    const baseUrl = readCookie(req, "onehealth_base_url")
    if (!accessToken || !baseUrl) return

    const root = baseUrl.replace(/\/api\/?$/, "")
    const incomingCookies = req.headers.get("cookie")
    const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` }
    if (incomingCookies) headers.Cookie = incomingCookies

    const res = await fetch(`${root}/auth/user/logout`, {
      method: "POST",
      headers,
      cache: "no-store",
    })
    console.log("[v0] /api/logout platformLogout:", res.status)
  } catch (e) {
    console.log("[v0] /api/logout platformLogout failed (continuing):", (e as Error)?.message)
  }
}

async function handle(req: Request): Promise<NextResponse> {
  // Invalidate the server-side platform session first, while the forwarded
  // access token is still valid. Best-effort — never blocks the cookie clear.
  await platformLogout(req)

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
