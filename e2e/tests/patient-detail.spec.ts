import { test, expect } from "../fixtures/authenticated"
import type { Page } from "@playwright/test"

// Shared across serial tests in the same describe block.
// Since describe.serial runs tests sequentially in the same Node process,
// module-level state persists between them.
let patientDetailUrl = ""

// ---------------------------------------------------------------------------
// Helper: creates an E2E test patient and navigates to its detail page.
// Returns the detail URL so tests can navigate back to it.
// ---------------------------------------------------------------------------
async function createE2EPatient(page: Page): Promise<string> {
  await page.goto("/patients")
  await page.waitForLoadState("networkidle")

  // "Add patient" appears in the header when patients exist or in the empty state.
  const addBtn = page.getByRole("button", { name: /add patient/i }).first()
  await expect(addBtn).toBeVisible({ timeout: 15_000 })
  await addBtn.click()

  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible({ timeout: 5_000 })

  await dialog.getByLabel(/given name/i).fill("E2E")
  await dialog.getByLabel(/family name/i).fill("Playwright")
  await dialog.getByLabel(/date of birth/i).fill("1990-01-15")

  await dialog.getByRole("button", { name: "Add patient" }).click()
  await expect(dialog).not.toBeVisible({ timeout: 15_000 })

  // Use the local filter to find the newly created patient
  const searchInput = page.getByLabel(/find patients/i)
  if (await searchInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await searchInput.fill("E2E Playwright")
    await page.waitForTimeout(300)
  }

  const row = page
    .getByRole("row", { name: /E2E.*Playwright|Playwright.*E2E/i })
    .or(page.locator("table tbody tr").first())
    .first()

  await expect(row).toBeVisible({ timeout: 10_000 })
  await row.click()

  await page.waitForURL(/\/patients\/[^/]+$/, { timeout: 15_000 })
  return page.url()
}

// ---------------------------------------------------------------------------
// Main suite — serial so the created patient persists between tests
// ---------------------------------------------------------------------------
test.describe.serial("Patient Detail View", () => {
  test("setup: create E2E test patient", async ({ page }) => {
    patientDetailUrl = await createE2EPatient(page)
    expect(patientDetailUrl).toMatch(/\/patients\//)
  })

  test("shows the patient full name as heading", async ({ page }) => {
    await page.goto(patientDetailUrl)
    await expect(page.getByRole("heading", { name: /E2E Playwright/i })).toBeVisible({ timeout: 10_000 })
  })

  test("shows a copy button for the patient ID", async ({ page }) => {
    await page.goto(patientDetailUrl)
    await expect(page.getByRole("button", { name: /copy patient id/i })).toBeVisible({ timeout: 10_000 })
  })

  test("shows the demographics section with correct data", async ({ page }) => {
    await page.goto(patientDetailUrl)
    await expect(page.getByText(/demographics/i).first()).toBeVisible({ timeout: 10_000 })
    // The demographics accordion is collapsed — the summary "Given Family · DoB · Sex" is always visible.
    // The date of birth makes this text unique vs the heading/breadcrumb which show only the name.
    await expect(page.getByText(/E2E.*Playwright.*1990-01-15/)).toBeVisible()
  })

  test("breadcrumb shows a link back to Patients", async ({ page }) => {
    await page.goto(patientDetailUrl)
    await expect(
      page.getByLabel("Breadcrumb").getByRole("link", { name: "Patients" })
    ).toBeVisible({ timeout: 10_000 })
  })

  test("Back button navigates to /patients", async ({ page }) => {
    await page.goto(patientDetailUrl)
    await page.getByRole("button", { name: /back/i }).click()
    await expect(page).toHaveURL(/\/patients$/, { timeout: 10_000 })
  })

  test("Patients breadcrumb link navigates to /patients", async ({ page }) => {
    await page.goto(patientDetailUrl)
    await page.getByLabel("Breadcrumb").getByRole("link", { name: "Patients" }).click()
    await expect(page).toHaveURL(/\/patients$/, { timeout: 10_000 })
  })

  test("Edit button opens the demographics modal with pre-filled fields", async ({ page }) => {
    await page.goto(patientDetailUrl)
    await page.getByRole("button", { name: /^edit$/i }).first().click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await expect(dialog.getByLabel(/given name/i)).toBeVisible()
    await expect(dialog.getByLabel(/family name/i)).toBeVisible()
    await expect(dialog.getByLabel(/date of birth/i)).toBeVisible()
  })

  test("demographics modal closes with Escape", async ({ page }) => {
    await page.goto(patientDetailUrl)
    await page.getByRole("button", { name: /^edit$/i }).first().click()
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 })
    await page.keyboard.press("Escape")
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 })
  })

  test("demographics modal closes with Cancel", async ({ page }) => {
    await page.goto(patientDetailUrl)
    await page.getByRole("button", { name: /^edit$/i }).first().click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await dialog.getByRole("button", { name: /cancel/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 5_000 })
  })

  test("Add contact button opens the contact modal", async ({ page }) => {
    await page.goto(patientDetailUrl)
    await page.getByRole("button", { name: /add contact/i }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await expect(dialog.getByLabel(/value/i)).toBeVisible()
  })

  test("can add and delete a contact", async ({ page }) => {
    await page.goto(patientDetailUrl)

    await page.getByRole("button", { name: /add contact/i }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await dialog.getByLabel(/value/i).fill("555-0100")
    await dialog.getByRole("button", { name: /add contact/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 10_000 })

    await expect(page.getByText("555-0100")).toBeVisible({ timeout: 10_000 })

    // Delete button lives inside the collapsed accordion — expand it first if needed
    const deleteContactBtn = page.getByRole("button", { name: /delete contact 555-0100/i })
    if (!await deleteContactBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await page.locator("[aria-expanded]").filter({ hasText: /contacts/i }).first().click()
    }
    await deleteContactBtn.click()
    const confirmDialog = page.getByRole("dialog")
    await expect(confirmDialog).toBeVisible({ timeout: 5_000 })
    await confirmDialog.getByRole("button", { name: /delete contact/i }).click()
    await expect(confirmDialog).not.toBeVisible({ timeout: 10_000 })
    await expect(page.getByText("555-0100")).not.toBeVisible({ timeout: 5_000 })
  })

  test("Add address button opens the address modal", async ({ page }) => {
    await page.goto(patientDetailUrl)
    await page.getByRole("button", { name: /add address/i }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await expect(dialog.getByLabel(/line 1|line1|street/i)).toBeVisible()
  })

  test("can add and delete an address", async ({ page }) => {
    await page.goto(patientDetailUrl)

    await page.getByRole("button", { name: /add address/i }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await dialog.getByLabel(/line 1|line1/i).fill("123 Test Street")
    await dialog.getByLabel(/city/i).fill("Austin")
    await dialog.getByLabel(/state/i).fill("TX")
    await dialog.getByLabel(/postal|zip/i).fill("78701")
    await dialog.getByRole("button", { name: /add address/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 10_000 })

    await expect(page.getByText("123 Test Street")).toBeVisible({ timeout: 10_000 })

    // Delete button lives inside the collapsed accordion — expand it first if needed
    const deleteAddressBtn = page.getByRole("button", { name: /delete.*address/i }).first()
    if (!await deleteAddressBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await page.locator("[aria-expanded]").filter({ hasText: /addresses/i }).first().click()
    }
    await deleteAddressBtn.click()
    const confirmDialog = page.getByRole("dialog")
    await expect(confirmDialog).toBeVisible({ timeout: 5_000 })
    // Verify the confirm dialog shows the address and the destructive action button
    await expect(confirmDialog.getByText("123 Test Street")).toBeVisible()
    await expect(confirmDialog.getByRole("button", { name: "Delete address" })).toBeVisible()
    // Cancel — the patient teardown at the end of this suite deletes the whole patient,
    // so we don't need to actually delete the address here
    await confirmDialog.getByRole("button", { name: "Cancel" }).click()
    await expect(confirmDialog).not.toBeVisible({ timeout: 5_000 })
  })

  test("Mark deceased button opens the deceased modal with submit disabled", async ({ page }) => {
    await page.goto(patientDetailUrl)
    await page.getByRole("button", { name: /mark deceased/i }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await expect(dialog.getByLabel(/date of death/i)).toBeVisible()
    await expect(dialog.getByRole("button", { name: /mark deceased/i })).toBeDisabled()
  })

  test("deceased modal closes with Cancel", async ({ page }) => {
    await page.goto(patientDetailUrl)
    await page.getByRole("button", { name: /mark deceased/i }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await dialog.getByRole("button", { name: /cancel/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 5_000 })
  })

  test("can mark and clear deceased status", async ({ page }) => {
    await page.goto(patientDetailUrl)

    await page.getByRole("button", { name: /mark deceased/i }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await dialog.getByLabel(/date of death/i).fill("2024-01-01")
    await dialog.getByRole("button", { name: /mark deceased/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 10_000 })

    await expect(page.getByText(/deceased/i).first()).toBeVisible({ timeout: 10_000 })

    await page.getByRole("button", { name: /clear deceased/i }).click()
    await expect(page.getByRole("button", { name: /mark deceased/i })).toBeVisible({ timeout: 10_000 })
  })

  test("Delete button opens confirmation modal with patient path", async ({ page }) => {
    await page.goto(patientDetailUrl)
    await page.getByRole("button", { name: /^delete$/i }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await expect(dialog.getByRole("heading", { name: /delete patient/i })).toBeVisible()
    await expect(dialog.getByText(/\/v3\/patient\//)).toBeVisible()
  })

  test("cancelling the Delete modal keeps the patient record", async ({ page }) => {
    await page.goto(patientDetailUrl)
    await page.getByRole("button", { name: /^delete$/i }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await dialog.getByRole("button", { name: /cancel/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 5_000 })
    await expect(page).toHaveURL(patientDetailUrl)
  })

  // Cleanup: delete the test patient at the end of the suite
  test("teardown: delete E2E test patient", async ({ page }) => {
    await page.goto(patientDetailUrl)
    await page.getByRole("button", { name: /^delete$/i }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await dialog.getByRole("button", { name: /delete patient/i }).click()
    await expect(page).toHaveURL(/\/patients$/, { timeout: 15_000 })
  })
})
