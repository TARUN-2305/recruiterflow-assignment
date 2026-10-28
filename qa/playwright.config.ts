import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load qa/.env (git-ignored) so REQRES_API_KEY never has to live in the code.
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '.env'), quiet: true });
const reqresApiKey = process.env.REQRES_API_KEY;

export default defineConfig({
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'ui',
      testDir: './tests/ui',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://www.saucedemo.com',
        // saucedemo marks elements with data-test="...", so getByTestId() reads that attribute.
        testIdAttribute: 'data-test',
      },
    },
    {
      // API tests only use the `request` fixture, so no browser is started for this project.
      name: 'api',
      testDir: './tests/api',
      use: {
        baseURL: 'https://reqres.in',
        extraHTTPHeaders: reqresApiKey ? { 'x-api-key': reqresApiKey } : {},
      },
    },
  ],
});
