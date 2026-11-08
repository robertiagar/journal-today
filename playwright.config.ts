import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results/renderer",
  testIgnore: ["**/electron/**", "**/unit/**"],
  fullyParallel: true,
  use: {
    baseURL: "http://127.0.0.1:3000",
    timezoneId: "Europe/Bucharest",
    locale: "en-US",
    channel: process.env.PLAYWRIGHT_CHANNEL ?? (process.platform === "win32" ? "msedge" : undefined),
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
  ],
  webServer: {
    command: "node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 3000 --strictPort",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
  },
});
