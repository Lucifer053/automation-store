// Registers 2 QA accounts on the demo site (same endpoint the signup page uses)
// and writes credentials to .env.test (gitignored). Usage: node tests/e2e/scripts/register-users.js
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const ROOT = path.resolve(__dirname, '../../..')
const ENV_FILE = path.join(ROOT, '.env.test')
const BASE_URL = process.env.BASE_URL || 'https://automation-store-eta.vercel.app'

async function main() {
  if (fs.existsSync(ENV_FILE) && /QA_USER2_PASSWORD=\S+/.test(fs.readFileSync(ENV_FILE, 'utf8'))) {
    console.log('.env.test already has credentials — not registering again.')
    return
  }
  const health = await fetch(`${BASE_URL}/api/products`)
  if (health.status !== 200) throw new Error(`SYSTEM DOWN: /api/products -> ${health.status}`)

  const stamp = Date.now()
  const lines = [`BASE_URL=${BASE_URL}`]
  for (const n of [1, 2]) {
    const email = `qa.pdfreport.${n}.${stamp}@example.com`
    const password = crypto.randomBytes(9).toString('base64url')
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `qa-pdf-${n}-${stamp}`, email, password, gender: 'Male',
        birth_day: '1', birth_month: '1', birth_year: '1990',
        first_name: 'QA', last_name: `Tester${n}`, address1: '1 Test Road',
        country: 'Thailand', state: 'Bangkok', city: 'Bang Rak', zipcode: '10500', mobile_number: '0800000000',
      }),
    })
    const json = await res.json()
    if (!json.success) throw new Error(`register user ${n} failed: ${res.status} ${json.error}`)
    lines.push(`QA_USER${n}_EMAIL=${email}`, `QA_USER${n}_PASSWORD=${password}`)
    console.log(`registered user ${n}: ${email}`)
  }
  fs.writeFileSync(ENV_FILE, lines.join('\n') + '\n', { mode: 0o600 })
  console.log('wrote .env.test')
}

main().catch((e) => { console.error(e.message); process.exit(1) })
