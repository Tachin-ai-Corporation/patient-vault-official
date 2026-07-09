import { defineConfig, devices } from "@playwright/test"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.resolve(__dirname, ".env.test") })

export const STORAGE_STATE = path.join(__dirname, ".auth/user.json")

// demo.1health.io resuelve a una IP de Tailscale (100.x.x.x), que Chrome
// clasifica como "local address space" y bloquea con Private Network Access.
// --disable-web-security suprime esa restricción para las pruebas E2E.
const CHROME_ARGS = ["--disable-web-security"]

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    baseURL: "https://pv.1health.io",
    trace: "on",
    screenshot: "on",
    video: "on",
    launchOptions: { args: CHROME_ARGS },
  },

  projects: [
    // Setup project: runs first, makes login and saves cookies
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"], launchOptions: { args: CHROME_ARGS } },
    },

    // Tests that require authentication (exclude *.no-auth.spec.ts)
    {
      name: "chromium",
      testIgnore: /.*\.no-auth\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: STORAGE_STATE,
        launchOptions: { args: CHROME_ARGS },
      },
      dependencies: ["setup"],
    },

    // Tests without authentication (auth page, etc.)
    {
      name: "no-auth",
      testMatch: /.*\.no-auth\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], launchOptions: { args: CHROME_ARGS } },
    },
  ],
})
