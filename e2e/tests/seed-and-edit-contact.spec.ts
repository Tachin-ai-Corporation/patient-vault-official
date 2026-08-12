import { test, expect } from "../fixtures/authenticated"
import type { Page } from "@playwright/test"

// End-to-end coverage for two workflows a developer exercises against a fresh
// vault, plus the breadcrumb affordance that ties the patient view back to the
// list:
//   1. Seeding synthetic patients and confirming they land in the grid.
//   2. Editing an existing patient's *email* contact (add → edit the value).
//   3. Asserting the breadcrumb trail on the patient detail view.
//
// Both the header ("Seed sample data") and the empty-state button read the same,
// so a single name matches regardless of whether the vault already has patients.
const SEED_BUTTON = /seed sample data/i

test.beforeEach(async ({ page }) => {
  await page.goto("/patients")
  await page.waitForLoadState("networkidle")
})

// ---------------------------------------------------------------------------
// 1. Seeding sample data
// ---------------------------------------------------------------------------
test.describe("Seed sample data → grid", () => {
  test("seeding creates patients that appear in the grid", async ({ page }) => {
    const seedBtn = page.getByRole("button", { name: SEED_BUTTON }).first()
    await expect(seedBtn).toBeVisible({ timeout: 15_000 })
    await seedBtn.click()

    // The progress modal opens and reports live progress in an X/total counter.
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await expect(dialog.getByRole("progressbar", { name: /seeding progress/i })).toBeVisible()
    await expect(dialog.getByText(/\d+\/\d+/)).toBeVisible({ timeout: 10_000 })

    // Seeding writes each patient (with contacts/addresses) via real v3 API
    // calls, so allow a generous window for the batch to finish.
    await expect(
      dialog.getByText(/created \d+ patients?\. you can close this dialog/i)
    ).toBeVisible({ timeout: 60_000 })

    // Dismissing the modal does not stop seeding — by now it is done, so the
    // grid should be populated once we close.
    await page.keyboard.press("Escape")
    await expect(dialog).not.toBeVisible({ timeout: 5_000 })

    await expect(page.locator("table")).toBeVisible({ timeout: 10_000 })
    await expect(page.locator("table tbody tr").first()).toBeVisible({ timeout: 10_000 })

    // The header count reflects a non-empty vault.
    await expect(page.getByText(/\d+\s+patients?\s+in/i)).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Helper: create a dedicated patient and open its detail page.
// Returns the detail URL so later tests can navigate straight back to it.
// ---------------------------------------------------------------------------
async function createPatientAndOpen(page: Page): Promise<string> {
  await page.goto("/patients")
  await page.waitForLoadState("networkidle")

  const addBtn = page.getByRole("button", { name: /add patient/i }).first()
  await expect(addBtn).toBeVisible({ timeout: 15_000 })
  await addBtn.click()

  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible({ timeout: 5_000 })
  await dialog.getByLabel(/given name/i).fill("Contact")
  await dialog.getByLabel(/family name/i).fill("EditTest")
  await dialog.getByLabel(/date of birth/i).fill("1988-06-30")
  await dialog.getByRole("button", { name: "Add patient" }).click()
  await expect(dialog).not.toBeVisible({ timeout: 15_000 })

  // Filter down to the new patient and open its row.
  const searchInput = page.getByLabel(/find patients/i)
  if (await searchInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await searchInput.fill("Contact EditTest")
    await page.waitForTimeout(300)
  }
  const row = page
    .getByRole("row", { name: /Contact.*EditTest|EditTest.*Contact/i })
    .or(page.locator("table tbody tr").first())
    .first()
  await expect(row).toBeVisible({ timeout: 10_000 })
  await row.click()

  await page.waitForURL(/\/patients\/[^/]+$/, { timeout: 15_000 })
  return page.url()
}

// Expands the collapsed "contacts" section so per-contact edit/delete buttons
// become interactive. Safe to call when already expanded.
async function expandContacts(page: Page) {
  const editAny = page.getByRole("button", { name: /^edit contact/i }).first()
  if (await editAny.isVisible({ timeout: 500 }).catch(() => false)) return
  await page.locator("[aria-expanded]").filter({ hasText: /contacts/i }).first().click()
}

// ---------------------------------------------------------------------------
// 2 & 3. Editing a patient's email contact + breadcrumb assertions
// ---------------------------------------------------------------------------
test.describe.serial("Edit patient email contact", () => {
  let detailUrl = ""
  const originalEmail = "original@example.com"
  const updatedEmail = "updated@example.com"

  test("setup: create the patient", async ({ page }) => {
    detailUrl = await createPatientAndOpen(page)
    expect(detailUrl).toMatch(/\/patients\//)
  })

  test("patient view shows the full breadcrumb trail", async ({ page }) => {
    await page.goto(detailUrl)
    const breadcrumb = page.getByLabel("Breadcrumb")
    await expect(breadcrumb).toBeVisible({ timeout: 10_000 })
    // Trail is: <project> / Patients / <patient name>. "Patients" is the one
    // link; the current patient is the trailing (non-link) crumb.
    await expect(breadcrumb.getByRole("link", { name: "Patients" })).toBeVisible()
    await expect(breadcrumb.getByText(/Contact EditTest/i)).toBeVisible()
  })

  test("breadcrumb Patients link returns to the list", async ({ page }) => {
    await page.goto(detailUrl)
    await page.getByLabel("Breadcrumb").getByRole("link", { name: "Patients" }).click()
    await expect(page).toHaveURL(/\/patients$/, { timeout: 10_000 })
  })

  test("add an email contact to the patient", async ({ page }) => {
    await page.goto(detailUrl)

    await page.getByRole("button", { name: /add contact/i }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    // Choose the "email" contact type and give it a value.
    await dialog.getByLabel("Type").selectOption("email")
    await dialog.getByLabel(/^value$/i).fill(originalEmail)
    await dialog.getByRole("button", { name: /add contact/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 10_000 })

    // The new email is rendered in the (now-expanded) contacts list.
    await expandContacts(page)
    await expect(page.getByText(originalEmail)).toBeVisible({ timeout: 10_000 })
  })

  test("edit the email contact to a new address", async ({ page }) => {
    await page.goto(detailUrl)
    await expandContacts(page)

    // Open the edit modal for the existing email contact.
    const editBtn = page.getByRole("button", { name: `Edit contact ${originalEmail}` })
    await expect(editBtn).toBeVisible({ timeout: 10_000 })
    await editBtn.click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await expect(dialog.getByRole("heading", { name: /edit contact/i })).toBeVisible()

    // The modal is pre-filled with the existing value; replace it.
    const valueInput = dialog.getByLabel(/^value$/i)
    await expect(valueInput).toHaveValue(originalEmail)
    await valueInput.fill(updatedEmail)
    await dialog.getByRole("button", { name: /save contact/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 10_000 })

    // The updated email replaces the old one in the record.
    await expandContacts(page)
    await expect(page.getByText(updatedEmail)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(originalEmail)).not.toBeVisible({ timeout: 5_000 })
  })

  test("teardown: delete the patient", async ({ page }) => {
    await page.goto(detailUrl)
    await page.getByRole("button", { name: /^delete$/i }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await dialog.getByRole("button", { name: /delete patient/i }).click()
    await expect(page).toHaveURL(/\/patients$/, { timeout: 15_000 })
  })
})
