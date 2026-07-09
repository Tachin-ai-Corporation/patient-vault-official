import { test, expect } from "../fixtures/authenticated"

test.describe("Documentation Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/documentation")
    await page.waitForURL(/\/documentation\//, { timeout: 15_000 })
  })

  test("redirects to the first documentation slug", async ({ page }) => {
    await expect(page).toHaveURL(/\/documentation\//)
  })

  test("shows the sidebar navigation", async ({ page }) => {
    const sidebar = page.locator("aside, nav").first()
    await expect(sidebar).toBeVisible({ timeout: 10_000 })
  })

  test("has a search input in the sidebar", async ({ page }) => {
    const searchInput = page
      .getByRole("searchbox")
      .or(page.getByPlaceholder(/search|filter/i))
      .first()
    await expect(searchInput).toBeVisible({ timeout: 10_000 })
  })

  test("renders markdown content in the main area", async ({ page }) => {
    const main = page.getByRole("main").or(page.locator("article, main")).first()
    await expect(main).toBeVisible({ timeout: 10_000 })
  })

  test("shows HTTP method badges (GET, POST, PATCH or DELETE)", async ({ page }) => {
    const badge = page
      .getByText(/^GET$/)
      .or(page.getByText(/^POST$/))
      .or(page.getByText(/^PATCH$/))
      .or(page.getByText(/^DELETE$/))
      .first()
    await expect(badge).toBeVisible({ timeout: 10_000 })
  })

  test("filtering by text switches the sidebar to endpoint results", async ({ page }) => {
    const searchInput = page
      .getByRole("searchbox")
      .or(page.getByPlaceholder(/search|filter/i))
      .first()

    if (!await searchInput.isVisible()) {
      test.skip()
      return
    }

    // With no query the sidebar shows resource nav links (no # in href)
    const navLinks = page.locator("aside a[href*='/documentation/']:not([href*='#'])")
    await expect(navLinks.first()).toBeVisible({ timeout: 5_000 })

    // Type a query — sidebar switches to endpoint results (# anchors) or "no match" msg
    await searchInput.fill("xyzxyz_nomatch_filter_12345")
    await page.waitForTimeout(300)

    await expect(page.getByText(/no endpoints match/i)).toBeVisible({ timeout: 5_000 })
  })

  test("clicking a sidebar link navigates to the endpoint page", async ({ page }) => {
    const sidebarLinks = page.locator("aside a, nav a[href*='/documentation/']")
    const count = await sidebarLinks.count()

    if (count < 2) {
      test.skip()
      return
    }

    const secondLink = sidebarLinks.nth(1)
    const href = await secondLink.getAttribute("href")
    await secondLink.click()

    if (href) {
      await expect(page).toHaveURL(
        new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
        { timeout: 10_000 }
      )
    }
  })
})
