import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 3100);
const externalBaseUrl = process.env.E2E_BASE_URL;
const baseURL = externalBaseUrl ?? `http://localhost:${port}`;
export const E2E_DATABASE_URL = process.env.E2E_DATABASE_URL ?? "postgres://mobited:mobited@localhost:5432/mobited_e2e";

/**
 * E2E runs against a production build on a dedicated database that is migrated and seeded
 * in global setup. Set E2E_BASE_URL to reuse an already running server instead.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  globalSetup: externalBaseUrl ? undefined : "./tests/e2e/global-setup.ts",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "bg-BG",
    timezoneId: "Europe/Sofia",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1366, height: 900 },
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : undefined,
      },
    },
  ],
  webServer: externalBaseUrl
    ? undefined
    : {
        command: `pnpm build && pnpm start -p ${port}`,
        url: `${baseURL}/vhod`,
        timeout: 600_000,
        reuseExistingServer: !process.env.CI,
        env: {
          DATABASE_URL: E2E_DATABASE_URL,
          AUTH_SECRET: process.env.AUTH_SECRET ?? "e2e-secret-not-for-production-0123456789",
          APP_URL: baseURL,
          MOBITED_DEV_MAILBOX: "1",
          MOBITED_LOCAL_UPLOADS: "1",
          MOBITED_DISABLE_RATE_LIMIT: "1",
        },
      },
});
