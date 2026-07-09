import { test as setup, expect } from "@playwright/test"
import * as fs from "fs"
import * as path from "path"
import { STORAGE_STATE } from "../playwright.config"

const LPL = process.env.TEST_LPL

setup("authenticate via Patient Vault", async ({ page }) => {
  // Strategy 1: reuse the refresh_token saved in the previous storageState.
  // storageState is updated on every run, so it always holds the latest token.
  if (fs.existsSync(STORAGE_STATE)) {
    const savedRefresh = readRefreshTokenFromState(STORAGE_STATE)
    if (savedRefresh) {
      const refreshed = await tryRefreshToken(savedRefresh)
      if (refreshed) {
        await page.context().addCookies([
          { name: "onehealth_environment", value: "demo", domain: "pv.1health.io", path: "/", expires: -1 },
          { name: "onehealth_base_url", value: "https://demo.1health.io", domain: "pv.1health.io", path: "/", expires: -1 },
          ...buildTokenCookies(refreshed),
        ])
        await page.goto("https://pv.1health.io/")
        await expect(page.getByRole("navigation")).toBeVisible({ timeout: 20_000 })
        await page.context().storageState({ path: STORAGE_STATE })
        console.log("✓ Session renewed with refresh_token from storageState")
        return
      }
      console.log("⚠ Refresh token expired, falling back to LPL...")
    }
  }

  // Strategy 2: authenticate with LPL (first run or after refresh_token expires)
  if (!LPL) {
    throw new Error(
      "No valid session found. Add TEST_LPL to .env.test with a valid 1health demo LPL."
    )
  }

  // Pre-set the environment cookies before loading /auth.
  await page.context().addCookies([
    { name: "onehealth_environment", value: "demo", domain: "pv.1health.io", path: "/", expires: -1 },
    { name: "onehealth_base_url", value: "https://demo.1health.io", domain: "pv.1health.io", path: "/", expires: -1 },
  ])

  // Navigate to Patient Vault with the LPL — the app handles the token exchange.
  const authUrl = `https://pv.1health.io/auth?lpl=${encodeURIComponent(LPL)}`
  await page.goto(authUrl)

  // Wait for /auth to process the LPL and redirect into the app.
  await page.waitForURL(/pv\.1health\.io\/(?!auth)/, { timeout: 30_000 })
  await expect(page).not.toHaveURL(/\/auth/)

  fs.mkdirSync(path.dirname(STORAGE_STATE), { recursive: true })
  await page.context().storageState({ path: STORAGE_STATE })
  console.log("✓ Authenticated successfully with LPL")
})

// ---------------------------------------------------------------------------

function readRefreshTokenFromState(statePath: string): string | null {
  try {
    const state = JSON.parse(fs.readFileSync(statePath, "utf-8"))
    const cookie = (state.cookies as Array<{ name: string; value: string }>)
      .find((c) => c.name === "refresh_token")
    return cookie?.value ?? null
  } catch {
    return null
  }
}

interface RefreshResult {
  access_token: string
  refresh_token: string
  expires_in: number
}

async function tryRefreshToken(refreshToken: string): Promise<RefreshResult | null> {
  try {
    const res = await fetch("https://demo.1health.io/auth/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}&client_id=public-client`,
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

function buildTokenCookies(data: RefreshResult) {
  const now = Math.floor(Date.now() / 1000)
  const maxAge = data.expires_in || 3600
  return [
    { name: "access_token", value: data.access_token, domain: "pv.1health.io", path: "/", expires: now + maxAge },
    { name: "refresh_token", value: data.refresh_token, domain: "pv.1health.io", path: "/", expires: now + maxAge * 2 },
    { name: "token_expires_at", value: String(now + maxAge), domain: "pv.1health.io", path: "/" },
    { name: "refresh_token_expires_at", value: String(now + maxAge * 2), domain: "pv.1health.io", path: "/" },
  ]
}
