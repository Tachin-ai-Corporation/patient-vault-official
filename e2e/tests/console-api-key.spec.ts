import { test, expect } from "../fixtures/authenticated"

test.describe("Console — API Key", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/console")
    await expect(page.getByRole("heading", { name: "Console" })).toBeVisible({ timeout: 10_000 })
  })

  test("shows the API key section heading and description", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /api key/i })).toBeVisible()
    await expect(
      page.getByText(/shown in full once at creation, then masked permanently/i)
    ).toBeVisible()
  })

  test("existing key is shown in masked state with prefix pv_sk_live_", async ({ page }) => {
    await expect(page.getByText(/pv_sk_live_/)).toBeVisible()
    await expect(page.getByText("Masked", { exact: true })).toBeVisible()
  })

  test("shows Rotate and Revoke buttons for an existing key", async ({ page }) => {
    await expect(page.getByRole("button", { name: /rotate/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /revoke/i })).toBeVisible()
  })

  test("Rotate button opens confirmation modal", async ({ page }) => {
    await page.getByRole("button", { name: /rotate/i }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await expect(dialog.getByText(/rotate api key/i)).toBeVisible()
    await expect(dialog.getByRole("button", { name: /rotate key/i })).toBeVisible()
  })

  test("cancelling Rotate modal keeps the existing masked key", async ({ page }) => {
    await page.getByRole("button", { name: /rotate/i }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await dialog.getByRole("button", { name: /cancel/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 5_000 })
    await expect(page.getByText(/pv_sk_live_/)).toBeVisible()
    await expect(page.getByText("Masked", { exact: true })).toBeVisible()
  })

  test("confirming Rotate shows the one-time reveal panel", async ({ page }) => {
    await page.getByRole("button", { name: /rotate/i }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await dialog.getByRole("button", { name: /rotate key/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 5_000 })

    // One-time reveal banner
    await expect(page.getByText(/shown once — copy it now/i)).toBeVisible()
    await expect(page.getByRole("button", { name: /copy api key/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /i've stored my key/i })).toBeVisible()
  })

  test("dismissing the one-time reveal returns to masked state", async ({ page }) => {
    // Rotate to get the reveal panel
    await page.getByRole("button", { name: /rotate/i }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await dialog.getByRole("button", { name: /rotate key/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 5_000 })
    await expect(page.getByText(/shown once — copy it now/i)).toBeVisible()

    // Dismiss it
    await page.getByRole("button", { name: /i've stored my key/i }).click()
    await expect(page.getByText(/shown once — copy it now/i)).not.toBeVisible()
    await expect(page.getByText("Masked", { exact: true })).toBeVisible()
  })

  test("Revoke button opens confirmation modal with destructive warning", async ({ page }) => {
    await page.getByRole("button", { name: /revoke/i }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await expect(dialog.getByText(/revoke api key/i)).toBeVisible()
    await expect(
      dialog.getByText(/immediately and permanently disables/i)
    ).toBeVisible()
    await expect(dialog.getByRole("button", { name: /revoke key/i })).toBeVisible()
  })

  test("cancelling Revoke modal keeps the existing key", async ({ page }) => {
    await page.getByRole("button", { name: /revoke/i }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await dialog.getByRole("button", { name: /cancel/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 5_000 })
    await expect(page.getByText("Masked", { exact: true })).toBeVisible()
  })

  test("confirming Revoke shows the Create API key empty state", async ({ page }) => {
    await page.getByRole("button", { name: /revoke/i }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await dialog.getByRole("button", { name: /revoke key/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 5_000 })

    // Empty state after revoke
    await expect(page.getByText(/no api key/i)).toBeVisible()
    await expect(page.getByRole("button", { name: /create api key/i })).toBeVisible()
  })

  test("Create API key shows the one-time reveal panel", async ({ page }) => {
    // First revoke to reach the empty state
    await page.getByRole("button", { name: /revoke/i }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await dialog.getByRole("button", { name: /revoke key/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 5_000 })

    // Create a new key
    await page.getByRole("button", { name: /create api key/i }).click()
    await expect(page.getByText(/shown once — copy it now/i)).toBeVisible()
    await expect(page.getByText(/pv_sk_live_/)).toBeVisible()
  })

  test("shows security guidance (1Password, never share)", async ({ page }) => {
    await expect(page.getByText(/1password/i)).toBeVisible()
    await expect(page.getByText(/never share this key/i)).toBeVisible()
  })
})
