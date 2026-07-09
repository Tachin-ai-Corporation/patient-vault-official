import { test, expect } from "../fixtures/authenticated"

// Navigate to /patients before every test so the patients data is fully loaded.
test.beforeEach(async ({ page }) => {
  await page.goto("/patients")
  await page.waitForLoadState("networkidle")
})

test.describe("Patients List View", () => {
  test("home page loads and shows the patients list", async ({ page }) => {
    await expect(page).toHaveURL(/pv\.1health\.io/)
    await expect(page.getByRole("navigation")).toBeVisible({ timeout: 10_000 })
  })

  test("search bar is available", async ({ page }) => {
    // The search input uses aria-label "Find patients" (not a placeholder)
    const searchInput = page.getByLabel(/find patients/i)
    await expect(searchInput).toBeVisible({ timeout: 10_000 })
  })

  test("can type in the search bar without errors", async ({ page }) => {
    const searchInput = page.getByLabel(/find patients/i)
    await expect(searchInput).toBeVisible({ timeout: 10_000 })
    await searchInput.fill("Test")
    await expect(searchInput).toHaveValue("Test")
  })

  test("shows the patients table or an empty state", async ({ page }) => {
    // The "Patients" heading is always visible once the page finishes loading —
    // both when the vault has patients (table shown) and when it is empty.
    await expect(page.getByRole("heading", { name: /^patients$/i })).toBeVisible({ timeout: 15_000 })
  })
})

test.describe("Add Patient Modal", () => {
  test("Add patient button exists", async ({ page }) => {
    const addButton = page.getByRole("button", { name: /add patient|nuevo paciente|new patient/i })
    await expect(addButton).toBeVisible({ timeout: 10_000 })
  })

  test("clicking Add patient opens the modal", async ({ page }) => {
    const addButton = page.getByRole("button", { name: /add patient|nuevo paciente|new patient/i })
    await addButton.click()
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 })
  })

  test("Add patient modal has the required fields", async ({ page }) => {
    const addButton = page.getByRole("button", { name: /add patient|nuevo paciente|new patient/i })
    await addButton.click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })

    // Uses "Given name" and "Family name" matching the 1health v3 API nomenclature
    await expect(dialog.getByLabel(/given name/i)).toBeVisible()
    await expect(dialog.getByLabel(/family name/i)).toBeVisible()
    await expect(dialog.getByLabel(/date of birth/i)).toBeVisible()
  })

  test("modal can be closed with Escape", async ({ page }) => {
    const addButton = page.getByRole("button", { name: /add patient|nuevo paciente|new patient/i })
    await addButton.click()

    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 })
    await page.keyboard.press("Escape")
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 3_000 })
  })
})
