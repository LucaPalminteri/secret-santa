import { defineConfig, devices } from "@playwright/test";

if (!process.env.TEST_DATABASE_URL) throw new Error("Run npm run test:e2e to use an isolated test database.");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 2,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    serviceWorkers: "block",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 5"] } },
  ],
  webServer: {
    command: process.env.PLAYWRIGHT_PRODUCTION === "1"
      ? "npm run build && npm run start -- --hostname 127.0.0.1 --port 3100"
      : "npm run dev -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      PLAYWRIGHT_TEST: "1",
      // Override local credentials even when a .env file exists.
      EMAIL_USER: "",
      EMAIL_PASS: "",
      DATABASE_URL: process.env.TEST_DATABASE_URL,
      DATABASE_URL_UNPOOLED: process.env.TEST_DATABASE_URL,
    },
  },
});
