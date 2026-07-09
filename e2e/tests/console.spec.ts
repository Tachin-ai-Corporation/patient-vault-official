import { test, expect } from "../fixtures/authenticated"

test.describe("Console Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/console")
    await expect(page.getByRole("heading", { name: "Console" })).toBeVisible({ timeout: 10_000 })
  })

  test("loads and shows the main heading", async ({ page }) => {
    await expect(page).toHaveURL(/\/console/)
    await expect(page.getByRole("heading", { name: "Console" })).toBeVisible()
  })

  test("shows the descriptive subtitle", async ({ page }) => {
    await expect(
      page.getByText(/manage your api key and developer profile/i)
    ).toBeVisible()
  })

  test("shows the API Key section", async ({ page }) => {
    await expect(page.getByText(/api key/i).first()).toBeVisible()
  })

  test("shows the Developer Profile section", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /developer profile/i })).toBeVisible({ timeout: 10_000 })
  })

  test("shows the API Inspector toggle", async ({ page }) => {
    await expect(page.getByText(/api inspector/i)).toBeVisible({ timeout: 10_000 })
  })

  test("shows the Promotion Code section", async ({ page }) => {
    await expect(page.getByText(/promotion|partner|promo/i).first()).toBeVisible({ timeout: 10_000 })
  })
})
