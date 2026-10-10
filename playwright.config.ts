import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E config pro 4rap.cz (rap-knowledge-graph).
 *
 * - Používá systémový Google Chrome (`channel: "chrome"`) — M-series MacBook Air
 *   s 8 GB RAM nechceme zbytečně zatěžovat dalším ~200 MB Chromium binary.
 * - Startuje `next dev` na portu 3114 (stejný jako `npm run dev`).
 * - Projects: mobile (iPhone 13 viewport) + desktop — bug s překrytým search
 *   inputem byl mobile-specific, takže mobile project je primární.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3114",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
    channel: "chrome",
  },

  projects: [
    {
      // iPhone 13 descriptor defaults to WebKit (Safari). Chceme ale systémový
      // Chrome (žádný WebKit download na 8GB MacBooku), takže viewport/UA
      // převezmeme z descriptor a browser necháme Chromium.
      name: "mobile",
      use: {
        ...devices["iPhone 13"],
        browserName: "chromium",
        channel: "chrome",
        defaultBrowserType: "chromium",
      },
    },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],

  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npx next dev -p 3114",
        url: "http://localhost:3114",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: "pipe",
      },
});
