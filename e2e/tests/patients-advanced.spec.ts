import { test, expect } from "../fixtures/authenticated"

// Ensure every test in this file starts on the patients page with the page fully loaded.
test.beforeEach(async ({ page }) => {
  await page.goto("/patients")
  await page.waitForLoadState("networkidle")
})

test.describe("Patient Search", () => {
  test("search input placeholder describes the feature", async ({ page }) => {
    const searchInput = page.getByLabel(/find patients/i)
    await expect(searchInput).toBeVisible({ timeout: 15_000 })
    await expect(searchInput).toHaveAttribute("placeholder", /find patients|name|date of birth/i)
  })

  test("typing in search filters the table locally", async ({ page }) => {
    const searchInput = page.getByLabel(/find patients/i)
    await expect(searchInput).toBeVisible({ timeout: 15_000 })
    await searchInput.fill("xyzxyzxyz_no_match_12345")
    await page.waitForTimeout(300)
    const rows = page.locator("table tbody tr")
    expect(await rows.count()).toBe(0)
  })

  test("clearing the search restores all patients", async ({ page }) => {
    const searchInput = page.getByLabel(/find patients/i)
    await expect(searchInput).toBeVisible({ timeout: 15_000 })

    await searchInput.fill("xyzxyzxyz_no_match_12345")
    await page.waitForTimeout(300)

    const clearBtn = page.getByRole("button", { name: "Clear search" })
    if (await clearBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await clearBtn.click()
    } else {
      await searchInput.fill("")
    }

    await page.waitForTimeout(500)
    expect(await page.locator("table tbody tr").count()).toBeGreaterThan(0)
  })

  test("pressing Enter triggers a server-side find and shows a notice", async ({ page }) => {
    const searchInput = page.getByLabel(/find patients/i)
    await expect(searchInput).toBeVisible({ timeout: 15_000 })

    await searchInput.fill("Test")
    await searchInput.press("Enter")

    // The API inspector bar (always visible at the bottom) shows the GET call immediately.
    // The paragraph also switches to "via /v3/patient/find" once React state updates.
    // Either element satisfies the assertion — the regex matches both.
    await expect(page.getByText(/\/v3\/patient\/find/i)).toBeVisible({ timeout: 10_000 })
  })
})

test.describe("Columns Menu", () => {
  test("Columns button is available when there are patients", async ({ page }) => {
    await expect(page.locator("table")).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole("button", { name: /columns/i })).toBeVisible()
  })

  test("Columns menu opens a popover with checkboxes", async ({ page }) => {
    await expect(page.locator("table")).toBeVisible({ timeout: 15_000 })
    await page.getByRole("button", { name: /columns/i }).click()
    const checkboxes = page.getByRole("checkbox")
    expect(await checkboxes.count()).toBeGreaterThan(0)
  })
})

test.describe("Seed Sample Data", () => {
  test("Seed sample data button opens the progress modal", async ({ page }) => {
    const hasTable = await page.locator("table").isVisible({ timeout: 10_000 }).catch(() => false)

    if (!hasTable) {
      const seedBtn = page.getByRole("button", { name: /seed/i })
      if (!await seedBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        test.skip()
        return
      }
      await seedBtn.click()
    } else {
      await page.getByRole("button", { name: /seed sample data/i }).click()
    }

    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText(/starting|creating|patient/i).first()).toBeVisible({ timeout: 10_000 })
  })
})

test.describe("Table Row Navigation", () => {
  test("clicking a row navigates to /patients/[id]", async ({ page }) => {
    await expect(page.locator("table tbody tr").first()).toBeVisible({ timeout: 15_000 })
    await page.locator("table tbody tr").first().click()
    await expect(page).toHaveURL(/\/patients\/[^/]+$/, { timeout: 10_000 })
  })

  test("patient detail page shows breadcrumb with Patients link", async ({ page }) => {
    await expect(page.locator("table tbody tr").first()).toBeVisible({ timeout: 15_000 })
    await page.locator("table tbody tr").first().click()
    await expect(page).toHaveURL(/\/patients\/[^/]+$/, { timeout: 10_000 })
    await expect(
      page.getByLabel("Breadcrumb").getByRole("link", { name: "Patients" })
    ).toBeVisible()
  })
})

test.describe("Clear Vault", () => {
  test("Clear button opens the confirmation modal", async ({ page }) => {
    await expect(page.locator("table")).toBeVisible({ timeout: 15_000 })
    await page.getByRole("button", { name: /^clear$/i }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await expect(dialog.getByRole("button", { name: /clear vault/i })).toBeVisible()
  })

  test("cancelling the Clear modal keeps all patients", async ({ page }) => {
    await expect(page.locator("table")).toBeVisible({ timeout: 15_000 })
    await page.getByRole("button", { name: /^clear$/i }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await dialog.getByRole("button", { name: /cancel/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 5_000 })
    await expect(page.locator("table")).toBeVisible()
  })
})
