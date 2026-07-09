import { test, expect } from "../fixtures/authenticated"

// Navigate to the patients page before every test in this file.
test.beforeEach(async ({ page }) => {
  await page.goto("/patients")
  await page.waitForLoadState("networkidle")
})

// Returns the Seed button regardless of whether the vault is empty or has patients.
// When patients exist the button reads "Seed sample data"; when empty it reads "Seed".
async function getSeedButton(page: import("@playwright/test").Page) {
  const hasTable = await page.locator("table").isVisible({ timeout: 5_000 }).catch(() => false)
  return hasTable
    ? page.getByRole("button", { name: /seed sample data/i })
    : page.getByRole("button", { name: /seed/i }).first()
}

test.describe("Seed Sample Data — Modal", () => {
  test("seed modal title and description are correct", async ({ page }) => {
    const seedBtn = await getSeedButton(page)
    await expect(seedBtn).toBeVisible({ timeout: 10_000 })
    await seedBtn.click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await expect(dialog.getByText(/seeding sample data/i)).toBeVisible()
    await expect(dialog.getByText(/synthetic patient records/i)).toBeVisible()
  })

  test("seed modal shows a progress counter in X/total format", async ({ page }) => {
    const seedBtn = await getSeedButton(page)
    await expect(seedBtn).toBeVisible({ timeout: 10_000 })
    await seedBtn.click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await expect(dialog.getByText(/\d+\/\d+/)).toBeVisible({ timeout: 5_000 })
  })

  test("seed modal shows a progress bar", async ({ page }) => {
    const seedBtn = await getSeedButton(page)
    await expect(seedBtn).toBeVisible({ timeout: 10_000 })
    await seedBtn.click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await expect(dialog.getByRole("progressbar", { name: /seeding progress/i })).toBeVisible()
  })

  test("seed modal can be dismissed while seeding is in progress", async ({ page }) => {
    const seedBtn = await getSeedButton(page)
    await expect(seedBtn).toBeVisible({ timeout: 10_000 })
    await seedBtn.click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await page.keyboard.press("Escape")
    await expect(dialog).not.toBeVisible({ timeout: 5_000 })
  })

  test("seed modal shows done state and patient count on completion", async ({ page }) => {
    const seedBtn = await getSeedButton(page)
    await expect(seedBtn).toBeVisible({ timeout: 10_000 })
    await seedBtn.click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    // The <p> element contains the full done message; the aria-live <span> only has the count.
    // Matching the full sentence avoids strict-mode violation from 2 elements matching.
    await expect(
      dialog.getByText(/created \d+ patients?\. you can close this dialog/i)
    ).toBeVisible({ timeout: 60_000 })
  })
})

test.describe("Seed Sample Data — Table Validation", () => {
  test("patients appear in the table after seeding completes", async ({ page }) => {
    // Intentionally skips when the vault already has patients — this test is designed
    // to validate the empty-vault → seed → table flow only.
    const hasTable = await page.locator("table").isVisible({ timeout: 5_000 }).catch(() => false)
    if (hasTable) {
      test.skip()
      return
    }

    const seedBtn = page.getByRole("button", { name: /seed/i }).first()
    await expect(seedBtn).toBeVisible({ timeout: 10_000 })
    await seedBtn.click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    await expect(
      dialog.getByText(/created \d+ patients?\. you can close this dialog/i)
    ).toBeVisible({ timeout: 60_000 })

    await page.keyboard.press("Escape")
    await expect(dialog).not.toBeVisible({ timeout: 5_000 })

    await expect(page.locator("table")).toBeVisible({ timeout: 10_000 })
    await expect(page.locator("table tbody tr").first()).toBeVisible()
  })
})
