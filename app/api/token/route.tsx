// app/api/token/route.ts
import { NextResponse } from "next/server"
import { createDecipheriv, createHmac } from "crypto"
import { cookies } from "next/headers"
import { markProductionRegistered } from "@/lib/production-registration"

interface AuthResponse {
  id: string
  scope: string
  token_type: string
  access_token: string
  expires_in: number
  refresh_token: string
  refresh_token_expires_in?: number
  id_token?: string
}

interface DecryptedPayload {
  required: {
    apiKey?: {
      name: string
    }
    tenant: {
      id: number
    }
    user: {
      id: number
    }
    oneTimeCode: {
      value: string
      issuedAt: string
      expiresAt: string
    }
  }
  optional?: {
    license?: string
    user_first_name?: string
    user_last_name?: string
    provider_1health_id?: string
    provider_npi?: string
    workflow_id?: string
    journey_id?: string
    journey_step_id?: string
    encounter_id?: string
    [key: string]: string | undefined
  }
}

type Environment = "demo" | "prod"

/**
 * Environment-aware configuration.
 * Resolves the correct secret key and base URL based on the chosen environment.
 */
function getEnvConfig(environment: Environment) {
  const secretKey =
    environment === "demo"
      ? process.env.ONEHEALTH_SECRET_KEY_DEMO
      : process.env.ONEHEALTH_SECRET_KEY_PROD

  const baseUrl =
    environment === "demo"
      ? "https://1health.demo.1health.io"
      : "https://1health.app.1health.io"

  const appId =
    environment === "demo"
      ? process.env.APP_ID_DEMO
      : process.env.APP_ID_PROD

  return { secretKey, baseUrl, appId }
}

/**
 * Derives a 256-bit AES key from the JWT token using HKDF-SHA256.
 * Matches Java's KeyDerivationUtil.derive() implementation.
 * Uses empty salt (defaults to 32 zeros) and empty info.
 */
function deriveKey(value: string): Buffer {
  const KEY_LENGTH_BYTES = 32 // 256 bits
  const inputKeyMaterial = Buffer.from(value, "utf8")

  // HKDF-Extract: PRK = HMAC-Hash(salt, IKM)
  // When salt is empty, it defaults to a string of zeros
  const salt = Buffer.alloc(32, 0)
  const prk = createHmac("sha256", salt).update(inputKeyMaterial).digest()

  // HKDF-Expand: OKM = HMAC-Hash(PRK, T(0) | info | 0x01)
  // When info is empty, we just use counter
  const info = Buffer.alloc(0)
  const okm = Buffer.alloc(KEY_LENGTH_BYTES)

  let currentT = Buffer.alloc(0)
  let offset = 0

  for (let i = 1; offset < KEY_LENGTH_BYTES; i++) {
    const hmac = createHmac("sha256", prk)
    hmac.update(currentT)
    hmac.update(info)
    hmac.update(Buffer.from([i]))
    currentT = hmac.digest()

    const bytesToCopy = Math.min(currentT.length, KEY_LENGTH_BYTES - offset)
    currentT.copy(okm, offset, 0, bytesToCopy)
    offset += bytesToCopy
  }

  return okm
}

/**
 * AES-256-GCM decrypt helper
 */
function decryptAesGcm({
  iv,
  tag,
  encryptedData,
  key,
}: {
  iv: Buffer
  tag: Buffer
  encryptedData: Buffer
  key: Buffer
}): string {
  const decipher = createDecipheriv("aes-256-gcm", key, iv)
  decipher.setAuthTag(tag)
  // Decrypt
  let decrypted = decipher.update(encryptedData)
  decrypted = Buffer.concat([decrypted, decipher.final()])
  return decrypted.toString("utf8")
}

/**
 * POST /api/token
 * Body:
 * {
 *   "lpl": "<base64>",         // IV (first 12 bytes) + ciphertext + tag (last 16 bytes)
 *   "environment": "demo"|"prod"  // Which environment to authenticate against
 * }
 *
 * This is the ONLY server-side route that requires the ONEHEALTH_SECRET_KEY.
 * All subsequent API calls are made client-side.
 */
/**
 * Shared attributes for every session cookie written by this route.
 *
 * `SameSite=None` + `Secure` + `Partitioned` (CHIPS) lets the cookie be sent when
 * Patient Vault is embedded in a cross-site iframe, while CHIPS scopes it to a
 * per-top-level-site jar so browsers phasing out third-party cookies still accept
 * it. `Secure` is derived from the real request protocol rather than `NODE_ENV`,
 * because `SameSite=None` is invalid without `Secure` — a non-production build
 * served over HTTPS (preview/staging) would otherwise have its cookies rejected.
 * On plain HTTP we fall back to `Lax` so local dev keeps working.
 *
 * `httpOnly: false` is intentional: client JS reads these tokens.
 */
function sessionCookieOptions(req: Request) {
  const isSecure = (req.headers.get("x-forwarded-proto") ?? "http").split(",")[0].trim() === "https"

  return isSecure
    ? { httpOnly: false, path: "/", sameSite: "none" as const, secure: true, partitioned: true }
    : { httpOnly: false, path: "/", sameSite: "lax" as const, secure: false }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()
    const cookieOpts = sessionCookieOptions(req)
    const body = await req.json()

    if (!body.lpl) {
      return NextResponse.json(
        { error: "Missing required field: lpl is required", retryable: false },
        { status: 400 },
      )
    }

    let lpl: Buffer
    try {
      lpl = Buffer.from(body.lpl, "base64")
    } catch (err) {
      return NextResponse.json(
        { error: "Invalid LPL format: not valid base64", retryable: false },
        { status: 400 },
      )
    }

    // Structure: IV (12 bytes) + ciphertext + tag (16 bytes)
    const IV_LENGTH = 12
    const TAG_LENGTH = 16

    if (lpl.length < IV_LENGTH + TAG_LENGTH) {
      return NextResponse.json(
        { error: "Invalid LPL format: payload too short", retryable: false },
        { status: 400 },
      )
    }

    const iv = lpl.subarray(0, IV_LENGTH)
    const ciphertext = lpl.subarray(IV_LENGTH)
    const tag = ciphertext.subarray(ciphertext.length - TAG_LENGTH)
    const encryptedData = ciphertext.subarray(0, ciphertext.length - TAG_LENGTH)

    // The key that successfully decrypts the launch payload is the authority for
    // its destination session slot. Never trust client state for this decision.
    let environment: Environment | null = null
    let secretKey: string | undefined
    let baseUrl = ""
    let decryptedString = ""

    for (const candidate of ["prod", "demo"] as const) {
      const config = getEnvConfig(candidate)
      if (!config.secretKey) continue
      try {
        decryptedString = decryptAesGcm({
          iv,
          tag,
          encryptedData,
          key: deriveKey(config.secretKey),
        })
        environment = candidate
        secretKey = config.secretKey
        baseUrl = config.baseUrl
        break
      } catch {
        // Try the other environment key.
      }
    }

    if (!environment || !secretKey) {
      return NextResponse.json(
        { error: "Invalid LPL: decryption failed for both production and demo.", retryable: false },
        { status: 400 },
      )
    }

    let payload: DecryptedPayload
    try {
      payload = JSON.parse(decryptedString)
    } catch (err) {
      return NextResponse.json(
        { error: "Invalid payload format: decrypted data is not valid JSON", retryable: false },
        { status: 400 },
      )
    }

    if (
      !payload.required ||
      !payload.required.tenant?.id ||
      !payload.required.user?.id ||
      !payload.required.oneTimeCode?.value
    ) {
      return NextResponse.json(
        { error: "Invalid launch payload: missing required fields", retryable: false },
        { status: 400 },
      )
    }

    // Generate HMAC-SHA256 signature using the ORIGINAL secret key (not derived)
    const signature = createHmac("sha256", Buffer.from(secretKey, "utf8"))
      .update(payload.required.oneTimeCode.value, "utf8")
      .digest("base64")

    const securityCode = payload.required.oneTimeCode.value

    const tokenExchangeUrl = `${baseUrl}/api/v2/public/external-application/auth/oauth2/user/token`

    let authRes: Response
    try {
      authRes = await fetch(tokenExchangeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature, securityCode }),
      })
    } catch (err) {
      return NextResponse.json(
        {
          error: "Failed to connect to 1health authentication service",
          details: String(err),
        },
        { status: 502 },
      )
    }

    const authData: AuthResponse = await authRes.json()

    if (!authRes.ok) {
      return NextResponse.json(
        {
          error: "Authentication failed",
          details: authData,
          statusCode: authRes.status,
        },
        { status: authRes.status },
      )
    }

    // Write only the detected environment's slot; preserve the other session.
    const prefix = environment
    const accessTokenMaxAge = authData.expires_in
    const refreshTokenMaxAge = authData.refresh_token_expires_in ?? accessTokenMaxAge * 2

    // Persist the exact launch-connected host with the environment session.
    // Requests, labels, API-key context, and Inspector copies must all follow
    // this value rather than reconstructing a host from client UI state.
    cookieStore.set(`${prefix}_base_url`, baseUrl, {
      ...cookieOpts,
      maxAge: refreshTokenMaxAge,
    })

    cookieStore.set(`${prefix}_access_token`, authData.access_token, {
      ...cookieOpts,
      maxAge: accessTokenMaxAge,
    })

    cookieStore.set(`${prefix}_refresh_token`, authData.refresh_token, {
      ...cookieOpts,
      maxAge: refreshTokenMaxAge,
    })

    const tokenExpiresAt = Math.floor(Date.now() / 1000) + accessTokenMaxAge
    const refreshExpiresAt = Math.floor(Date.now() / 1000) + refreshTokenMaxAge

    cookieStore.set(`${prefix}_refresh_token_expires_at`, String(refreshExpiresAt), {
      ...cookieOpts,
      maxAge: refreshTokenMaxAge,
    })

    cookieStore.set(`${prefix}_token_expires_at`, String(tokenExpiresAt), {
      ...cookieOpts,
      maxAge: refreshTokenMaxAge,
    })

    try {
      const tenantUrl = `${baseUrl}/api/v2/tenant`

      const tenantRes = await fetch(tenantUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authData.access_token}`,
          "Content-Type": "application/json",
        },
      })

      if (tenantRes.ok) {
        const tenantData = await tenantRes.json()

        // Store tenant org ID in cookie for client-side access
        if (tenantData.organization?.id) {
          cookieStore.set(`${prefix}_user_org_id`, String(tenantData.organization.id), {
            ...cookieOpts,
            maxAge: refreshTokenMaxAge,
          })
        }

        // Store user ID from the decrypted payload
        cookieStore.set(`${prefix}_user_id`, String(payload.required.user.id), {
          ...cookieOpts,
          maxAge: refreshTokenMaxAge,
        })
      }
    } catch (tenantErr) {
      // Non-fatal - continue with token response
    }

    if (environment === "prod") {
      const stagingUserId = cookieStore.get("demo_user_id")?.value
      if (stagingUserId) {
        try {
          await markProductionRegistered(
            stagingUserId,
            String(payload.required.user.id),
          )
        } catch (registrationError) {
          console.error(
            "[production-registration] Failed to persist registration state",
            registrationError,
          )
        }
      }
    }

    cookieStore.set("active_environment", environment, {
      ...cookieOpts,
      maxAge: 60 * 60 * 24 * 30,
    })
    // Keep the legacy active-session cookie synchronized for older consumers.
    cookieStore.set("onehealth_base_url", baseUrl, {
      ...cookieOpts,
      maxAge: refreshTokenMaxAge,
    })

    return NextResponse.json({ ...authData, environment })
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Unable to process the request",
        details: err.message || String(err),
      },
      { status: 500 },
    )
  }
}
