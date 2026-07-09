import { test, expect } from "../fixtures/authenticated"

test.describe("Console — Developer Profile", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/console")
    await expect(page.getByRole("heading", { name: "Console" })).toBeVisible({ timeout: 10_000 })
  })

  test("shows the Developer profile section heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /developer profile/i })).toBeVisible()
  })

  test("shows First name and Last name fields pre-filled", async ({ page }) => {
    await expect(page.getByLabel(/first name/i)).toBeVisible()
    await expect(page.getByLabel(/last name/i)).toBeVisible()
    // Fields should have some value (the user's actual name)
    const first = await page.getByLabel(/first name/i).inputValue()
    expect(first.length).toBeGreaterThan(0)
  })

  test("Email field is read-only and shows a locked indicator", async ({ page }) => {
    const emailInput = page.getByLabel(/email/i)
    await expect(emailInput).toBeVisible()
    await expect(emailInput).toBeDisabled()
    await expect(
      page.getByText(/email is managed by your identity provider/i)
    ).toBeVisible()
  })

  test("Save changes button is disabled when the form is untouched", async ({ page }) => {
    await expect(page.getByRole("button", { name: /save changes/i })).toBeDisabled()
  })

  test("Save changes button enables after editing First name", async ({ page }) => {
    const firstInput = page.getByLabel(/first name/i)
    const original = await firstInput.inputValue()
    await firstInput.fill(original + " X")
    await expect(page.getByRole("button", { name: /save changes/i })).toBeEnabled()
    // Restore original value
    await firstInput.fill(original)
  })

  test("Save changes button is disabled when First name is cleared", async ({ page }) => {
    const firstInput = page.getByLabel(/first name/i)
    await firstInput.clear()
    await expect(page.getByRole("button", { name: /save changes/i })).toBeDisabled()
  })

  test("saving a name change shows the Saved confirmation", async ({ page }) => {
    const lastInput = page.getByLabel(/last name/i)
    const original = await lastInput.inputValue()

    await lastInput.fill(original + "-E2E")
    await page.getByRole("button", { name: /save changes/i }).click()
    await expect(page.getByRole("status", { name: /saved/i }).or(
      page.getByText(/^saved\.$/i)
    )).toBeVisible({ timeout: 5_000 })

    // Restore original value
    await lastInput.fill(original)
    await page.getByRole("button", { name: /save changes/i }).click()
  })

  test("shows link to Terms & Conditions and Privacy Policy", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: /terms.*conditions|privacy policy/i })
    ).toBeVisible()
  })
})

test.describe("Console — API-call Viewer Toggle", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/console")
    await expect(page.getByRole("heading", { name: "Console" })).toBeVisible({ timeout: 10_000 })
  })

  test("shows the API-call viewer section", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /api-call viewer/i })).toBeVisible()
  })

  test("toggle switch is present with correct role and label", async ({ page }) => {
    const toggle = page.getByRole("switch", { name: /toggle api-call viewer/i })
    await expect(toggle).toBeVisible()
  })

  test("toggling the switch changes its aria-checked state", async ({ page }) => {
    const toggle = page.getByRole("switch", { name: /toggle api-call viewer/i })
    const initialState = await toggle.getAttribute("aria-checked")

    await toggle.click()
    const newState = await toggle.getAttribute("aria-checked")
    expect(newState).not.toBe(initialState)

    // Restore original state
    await toggle.click()
  })

  test("status text updates between On and Off after toggling", async ({ page }) => {
    const toggle = page.getByRole("switch", { name: /toggle api-call viewer/i })

    // Read initial text
    const statusLine = page.locator("section").filter({ hasText: /api-call viewer/i }).locator("p.font-mono")
    const before = await statusLine.textContent()

    await toggle.click()
    const after = await statusLine.textContent()
    expect(after).not.toBe(before)

    // Restore
    await toggle.click()
  })
})

test.describe("Console — Partner Code", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/console")
    await expect(page.getByRole("heading", { name: "Console" })).toBeVisible({ timeout: 10_000 })
  })

  test("shows the Partner code section with input and Apply button", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /partner code/i })).toBeVisible()
    await expect(page.getByPlaceholder(/enter partner code/i)).toBeVisible()
    await expect(page.getByRole("button", { name: /apply/i })).toBeVisible()
  })

  test("Apply button is disabled when the input is empty", async ({ page }) => {
    await expect(page.getByRole("button", { name: /apply/i })).toBeDisabled()
  })

  test("Apply button enables after typing a code", async ({ page }) => {
    await page.getByPlaceholder(/enter partner code/i).fill("TEST")
    await expect(page.getByRole("button", { name: /apply/i })).toBeEnabled()
  })

  test("valid partner code VERGE activates partner terms", async ({ page }) => {
    await page.getByPlaceholder(/enter partner code/i).fill("VERGE")
    await page.getByRole("button", { name: /apply/i }).click()
    await expect(page.getByText(/verge fund/i)).toBeVisible()
    await expect(page.getByText(/partner terms active/i)).toBeVisible()
  })

  test("unrecognized code shows an error message", async ({ page }) => {
    await page.getByPlaceholder(/enter partner code/i).fill("INVALID_CODE_XYZ")
    await page.getByRole("button", { name: /apply/i }).click()
    await expect(page.getByText(/code not recognized/i)).toBeVisible()
  })

  test("Enter key applies the code", async ({ page }) => {
    await page.getByPlaceholder(/enter partner code/i).fill("VERGE")
    await page.keyboard.press("Enter")
    await expect(page.getByText(/verge fund/i)).toBeVisible()
  })
})
