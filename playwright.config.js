const path = require('path')
const { defineConfig } = require('@playwright/test')
require('dotenv').config({ path: path.resolve(__dirname, '.env.test') })
const { BASE_URL } = require('./tests/e2e/helpers/env')

module.exports = defineConfig({
  testDir: './tests/e2e',
  globalSetup: require.resolve('./tests/e2e/global-setup.js'),
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1, // tests create orders on the live demo DB; keep it serial and small
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    acceptDownloads: true,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
})
