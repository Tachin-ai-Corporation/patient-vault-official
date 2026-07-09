import { test, expect } from "@playwright/test"

/**
 * Tests for the /auth page (no active session).
 * Uses the "no-auth" project — does not depend on the login setup.
 */
test.describe("Authentication Page /auth", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies()
    await page.goto("/auth")
  })

  test("shows the environment selector when there is no session", async ({ page }) => {
    await expect(page.getByText("Choose Environment")).toBeVisible({ timeout: 8_000 })
    await expect(page.getByRole("button", { name: /demo/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /production/i })).toBeVisible()
  })

  test("selecting Demo shows the LPL form", async ({ page }) => {
    await page.getByRole("button", { name: /demo/i }).click()

    // Without an LPL in the URL the app shows the "manual-entry" state
    await expect(page.getByText("Authentication Required")).toBeVisible({ timeout: 8_000 })
    await expect(page.getByLabel(/launch payload/i)).toBeVisible()
    await expect(page.getByRole("button", { name: /submit/i })).toBeDisabled()
  })

  test("Submit button enables once the LPL field has a value", async ({ page }) => {
    await page.getByRole("button", { name: /demo/i }).click()
    await expect(page.getByLabel(/launch payload/i)).toBeVisible({ timeout: 8_000 })

    await page.getByLabel(/launch payload/i).fill("test-lpl-value")
    await expect(page.getByRole("button", { name: /submit/i })).toBeEnabled()
  })

  test("can switch back to environment selection from the LPL form", async ({ page }) => {
    await page.getByRole("button", { name: /demo/i }).click()
    await expect(page.getByText("Authentication Required")).toBeVisible({ timeout: 8_000 })

    await page.getByRole("button", { name: /switch environment/i }).click()
    await expect(page.getByText("Choose Environment")).toBeVisible()
  })

  test("shows the 1health logo", async ({ page }) => {
    await expect(page.getByAltText("1health")).toBeVisible()
  })
})
