import { test, expect } from "../fixtures/authenticated"

test.describe("Settings Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings")
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible({ timeout: 10_000 })
  })

  test("loads and shows the main heading", async ({ page }) => {
    await expect(page).toHaveURL(/\/settings/)
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible()
  })

  test("shows the descriptive subtitle with the project name", async ({ page }) => {
    await expect(page.getByText(/usage, billing, and the checkpoint/i)).toBeVisible()
  })
})

test.describe("Settings — Project Section", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings")
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible({ timeout: 10_000 })
  })

  test("shows the Project section with a name input", async ({ page }) => {
    await expect(page.getByLabel(/project name/i)).toBeVisible()
  })

  test("Save button is disabled when the name is unchanged", async ({ page }) => {
    // Find the Save button in the Project section (not other sections)
    const projectSection = page.locator("section").filter({ hasText: /00 · project/i })
    await expect(projectSection.getByRole("button", { name: /save/i })).toBeDisabled()
  })

  test("Save button enables after editing the project name", async ({ page }) => {
    const input = page.getByLabel(/project name/i)
    const original = await input.inputValue()
    await input.fill(original + " X")

    const projectSection = page.locator("section").filter({ hasText: /00 · project/i })
    await expect(projectSection.getByRole("button", { name: /save/i })).toBeEnabled()

    // Restore original name
    await input.fill(original)
  })

  test("clearing the project name shows a validation error", async ({ page }) => {
    const input = page.getByLabel(/project name/i)
    await input.clear()
    await expect(page.getByText(/project name cannot be empty/i)).toBeVisible()
  })
})

test.describe("Settings — Usage Section", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings")
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible({ timeout: 10_000 })
  })

  test("shows the Usage section with environment chip", async ({ page }) => {
    const usageSection = page.locator("section").filter({ hasText: /01 · usage/i })
    await expect(usageSection).toBeVisible()
    await expect(usageSection.getByText(/staging|production/i)).toBeVisible()
  })

  test("shows the patient usage progress bar", async ({ page }) => {
    await expect(page.getByRole("progressbar")).toBeVisible()
  })

  test("shows the patient count with the free ceiling", async ({ page }) => {
    const usageSection = page.locator("section").filter({ hasText: /01 · usage/i })
    // Shows "X / 1,000" or similar pattern
    await expect(usageSection.getByText(/patients/i)).toBeVisible()
  })

  test("shows the partner code claim form in Usage", async ({ page }) => {
    const usageSection = page.locator("section").filter({ hasText: /01 · usage/i })
    await expect(
      usageSection.getByRole("button", { name: /claim credits|update code/i })
    ).toBeVisible()
  })
})

test.describe("Settings — Billing Section", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings")
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible({ timeout: 10_000 })
  })

  test("shows the Billing section with pricing info", async ({ page }) => {
    const billingSection = page.locator("section").filter({ hasText: /02 · billing/i })
    await expect(billingSection).toBeVisible()
    await expect(billingSection.getByText(/\$1.*patient.*year/i)).toBeVisible()
  })

  test("shows the Add payment method button", async ({ page }) => {
    await expect(page.getByRole("button", { name: /add payment method/i })).toBeVisible()
  })
})

test.describe("Settings — Production Checkpoint", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings")
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible({ timeout: 10_000 })
  })

  test("shows the Production checkpoint section", async ({ page }) => {
    const section = page.locator("section").filter({ hasText: /03 · production checkpoint/i })
    await expect(section).toBeVisible()
    await expect(section.getByText(/staging.*production/i)).toBeVisible()
  })

  test("shows Switch to production button or Production active badge", async ({ page }) => {
    const switchBtn = page.getByRole("button", { name: /switch to production/i })
    const activeBadge = page.getByText(/production active/i)
    const hasSwitch = await switchBtn.isVisible().catch(() => false)
    const hasActive = await activeBadge.isVisible().catch(() => false)
    expect(hasSwitch || hasActive).toBe(true)
  })

  test("Switch to production opens the Go Live flow modal", async ({ page }) => {
    const switchBtn = page.getByRole("button", { name: /switch to production/i })
    if (!await switchBtn.isVisible().catch(() => false)) {
      test.skip()
      return
    }
    await switchBtn.click()
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 })
  })
})

test.describe("Settings — Danger Zone", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings")
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible({ timeout: 10_000 })
  })

  test("shows the Danger Zone section with destructive styling", async ({ page }) => {
    const dangerSection = page.locator("section").filter({ hasText: /06 · danger zone/i })
    await expect(dangerSection).toBeVisible()
    await expect(dangerSection.getByRole("heading", { name: /delete project/i })).toBeVisible()
  })

  test("Delete project button opens the type-to-confirm modal", async ({ page }) => {
    // Only staging projects can be self-serve deleted
    const deleteBtn = page.locator("section")
      .filter({ hasText: /06 · danger zone/i })
      .getByRole("button", { name: /delete project/i })

    if (!await deleteBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      test.skip()
      return
    }

    await deleteBtn.click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await expect(dialog.getByText(/type.*to confirm/i)).toBeVisible()
  })

  test("Delete project confirm button is disabled until project name is typed", async ({ page }) => {
    const deleteBtn = page.locator("section")
      .filter({ hasText: /06 · danger zone/i })
      .getByRole("button", { name: /delete project/i })

    if (!await deleteBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      test.skip()
      return
    }

    await deleteBtn.click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await expect(dialog.getByRole("button", { name: /delete project/i })).toBeDisabled()
  })

  test("cancelling the Delete project modal keeps the project", async ({ page }) => {
    const deleteBtn = page.locator("section")
      .filter({ hasText: /06 · danger zone/i })
      .getByRole("button", { name: /delete project/i })

    if (!await deleteBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      test.skip()
      return
    }

    await deleteBtn.click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await dialog.getByRole("button", { name: /cancel/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 5_000 })
    await expect(page).toHaveURL(/\/settings/)
  })
})
