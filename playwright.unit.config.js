// Unit tests for pure helpers (no browser, no server). Run: npm run test:unit
const { defineConfig } = require('@playwright/test')

module.exports = defineConfig({
  testDir: './tests/unit',
  reporter: 'list',
})
