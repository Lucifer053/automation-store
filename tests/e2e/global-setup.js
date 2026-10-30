const { request } = require('@playwright/test')
const { BASE_URL } = require('./helpers/env')

// Spec §10: before any e2e run, GET /api/products must answer 200.
// If not, the system is down — report that, do not let tests "fail".
module.exports = async function globalSetup() {
  const ctx = await request.newContext({ baseURL: BASE_URL })
  let status = 'no response'
  try {
    const res = await ctx.get('/api/products', { timeout: 30_000 })
    status = res.status()
    if (status === 200) return
  } catch (e) {
    status = `error: ${e.message}`
  } finally {
    await ctx.dispose()
  }
  throw new Error(
    `SYSTEM DOWN (not a test failure): GET ${BASE_URL}/api/products -> ${status}. ` +
    'Report to the controller; do not treat as test fail.'
  )
}
