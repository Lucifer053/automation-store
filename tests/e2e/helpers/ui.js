const fs = require('fs')
const { expect } = require('@playwright/test')

// Seed localStorage (the app keeps session in `as_auth`, cart in `as_cart`) before navigating.
async function seed(page, { session, cart }) {
  await page.goto('/')
  await page.evaluate(({ session, cart }) => {
    if (session) localStorage.setItem('as_auth', JSON.stringify({ user: session.user, token: session.token }))
    if (cart) localStorage.setItem('as_cart', JSON.stringify(cart))
  }, { session, cart })
}

const cartItem = (p, quantity = 1) => ({ id: p.id, name: p.name, price: Number(p.price), image_url: p.image_url, quantity })

async function clickAndDownload(page, locator) {
  const [dl] = await Promise.all([page.waitForEvent('download'), locator.click()])
  const buffer = fs.readFileSync(await dl.path())
  return { filename: dl.suggestedFilename(), buffer }
}

async function expectQa(page, names) {
  for (const n of names) await expect(page.locator(`[data-qa="${n}"]`).first(), `data-qa=${n}`).toBeVisible()
}

// Drive the 5-step checkout from step 1 through Place Order. Returns the new order id.
async function checkoutViaUI(page, { address, shipping = 'Ground', payment = 'Check / Money Order', card } = {}) {
  const a = address || {}
  // wait for the async profile prefill (/api/auth/me) so it can't overwrite what we type
  await expect(page.locator('[data-qa="addr-name"]')).not.toHaveValue('')
  const fill = async (qa, v) => { if (v !== undefined) await page.locator(`[data-qa="${qa}"]`).fill(v) }
  await fill('addr-name', a.full_name ?? 'QA Tester')
  await fill('addr-email', a.email)
  await fill('addr-phone', a.phone)
  await fill('addr-address', a.address ?? '1 Test Road')
  await fill('addr-state', a.state ?? 'Bangkok')
  await fill('addr-city', a.city ?? 'Bang Rak')
  await fill('addr-zipcode', a.zipcode ?? '10500')
  await page.locator('[data-qa="checkout-continue"]').click()
  await page.locator(`[data-qa="shipping-${shipping.replace(/\s+/g, '-').toLowerCase()}"]`).click()
  await page.locator('[data-qa="checkout-continue"]').click()
  await page.locator(`[data-qa="payment-${payment === 'Credit Card' ? 'card' : 'cod'}"]`).click()
  await page.locator('[data-qa="checkout-continue"]').click()
  if (payment === 'Credit Card') {
    await fill('card-number', card.number)
    await fill('card-name', card.name ?? 'QA TESTER')
    await fill('card-expiry', card.expiry ?? '12/30')
    await fill('card-cvv', card.cvv ?? '123')
  }
  await page.locator('[data-qa="checkout-continue"]').click()
  await expect(page.locator('[data-qa="step-confirm"]')).toBeVisible()
  await page.locator('[data-qa="place-order"]').click()
  await page.waitForURL(/\/orders\/\d+\?placed=1/)
  return Number(new URL(page.url()).pathname.split('/').pop())
}

module.exports = { seed, cartItem, clickAndDownload, expectQa, checkoutViaUI }
