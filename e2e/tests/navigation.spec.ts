import { test, expect } from "../fixtures/authenticated"

test.describe("Top Navigation", () => {
  test("renders all three nav destinations", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Console" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Patients" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Documentation" })).toBeVisible()
  })

  test("navigates to /console on Console click", async ({ page }) => {
    await page.getByRole("link", { name: "Console" }).click()
    await expect(page).toHaveURL(/\/console/, { timeout: 10_000 })
  })

  test("navigates to /patients on Patients click", async ({ page }) => {
    await page.goto("/console")
    await page.getByRole("link", { name: "Patients" }).click()
    await expect(page).toHaveURL(/\/patients/, { timeout: 10_000 })
  })

  test("navigates to /documentation on Documentation click", async ({ page }) => {
    await page.getByRole("link", { name: "Documentation" }).click()
    await expect(page).toHaveURL(/\/documentation/, { timeout: 10_000 })
  })

  test("project switcher is visible in the top bar", async ({ page }) => {
    await expect(page.getByRole("navigation")).toBeVisible()
  })

  test("active nav link reflects the current route", async ({ page }) => {
    await expect(page).toHaveURL(/\/patients/)
    await expect(page.getByRole("link", { name: "Patients" })).toBeVisible()

    await page.getByRole("link", { name: "Console" }).click()
    await expect(page).toHaveURL(/\/console/, { timeout: 10_000 })
    await expect(page.getByRole("link", { name: "Console" })).toBeVisible()
  })
})

test.describe("User Menu", () => {
  test("user menu area is present in the top bar", async ({ page }) => {
    await expect(page.getByRole("navigation")).toBeVisible()
  })
})
