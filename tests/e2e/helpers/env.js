const BASE_URL = process.env.BASE_URL || 'https://automation-store-eta.vercel.app'

function need(name) {
  const v = process.env[name]
  if (!v) {
    throw new Error(
      `Missing env ${name}. Create .env.test (see .env.test.example) — ` +
      'run: node tests/e2e/scripts/register-users.js'
    )
  }
  return v
}

function creds(n) {
  return { email: need(`QA_USER${n}_EMAIL`), password: need(`QA_USER${n}_PASSWORD`) }
}

module.exports = { BASE_URL, need, creds }
