import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: ['**/privacy.spec.ts', '**/numeric-display.spec.ts', '**/drawers.spec.ts'], workers: 1,
  use: { baseURL: 'http://127.0.0.1:4173', viewport: { width: 390, height: 844 },
    launchOptions: { executablePath: process.env.FITNESS_CHROMIUM_PATH || undefined, args: ['--no-sandbox'] } },
  webServer: { command: 'npm run preview -- --host 127.0.0.1 --port 4173', url: 'http://127.0.0.1:4173', reuseExistingServer: false },
});
