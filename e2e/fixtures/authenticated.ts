import { test as base, expect } from "@playwright/test"

// Extends the base test by waiting for the session to fully load before each test.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.goto("/")
    // A visible navigation means the user is authenticated and the session is ready.
    await expect(page.getByRole("navigation")).toBeVisible({ timeout: 20_000 })
    await use(page)
  },
})

export { expect } from "@playwright/test"
