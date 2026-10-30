// Spec §7: behaviour that must NOT change after the PDF feature. Existing data-qa hooks are asserted too.
const { test, expect } = require('./fixtures')
const { seed, cartItem, checkoutViaUI, expectQa } = require('./helpers/ui')

const ADDRESS_QA = ['addr-name', 'addr-email', 'addr-phone', 'addr-address', 'addr-state', 'addr-city', 'addr-zipcode', 'addr-country']
const SUMMARY_QA = ['order-summary', 'summary-subtotal', 'summary-shipping', 'summary-total']
const CARD = { number: '4111 1111 1111 1111', name: 'QA TESTER', expiry: '12/30', cvv: '123' }

test.describe('products & cart', () => {
  test('add to cart, quantity, totals, terms checkbox, guest -> login', async ({ page, world }) => {
    await page.goto('/products')
    const card = page.locator('[data-qa="product-item"]').first()
    await expect(card).toBeVisible()
    await expectQa(page, ['product-name', 'product-price', 'view-product'])
    const price = Number((await card.locator('[data-qa="product-price"]').innerText()).replace(/^\s*Rs\.?\s*/i, '').replace(/,/g, ''))
    await card.hover()
    await card.locator('[data-qa="add-to-cart"]').click()
    await page.goto('/cart')
    await expectQa(page, ['cart-heading', 'cart-table', 'cart-row', 'cart-name', 'cart-price', 'cart-quantity', 'cart-subtotal', 'cart-total', 'cart-delete', 'agree-terms', 'checkout'])
    await expect(page.locator('[data-qa="cart-total"]')).toHaveText(`Rs. ${price}`)
    await page.locator('[data-qa="cart-quantity"]').fill('3')
    await expect(page.locator('[data-qa="cart-subtotal"]')).toHaveText(`Rs. ${price * 3}`)
    await expect(page.locator('[data-qa="cart-total"]')).toHaveText(`Rs. ${price * 3}`)

    // terms not ticked -> blocked with message
    await page.locator('[data-qa="checkout"]').click()
    await expect(page.locator('[data-qa="cart-note"]')).toHaveText('Please agree to the terms of service to continue.')
    await expect(page).toHaveURL(/\/cart$/)
    // ticked + guest -> /login
    await page.locator('[data-qa="agree-terms"]').check()
    await page.locator('[data-qa="checkout"]').click()
    await page.waitForURL(/\/login$/)
  })

  test('logged-in user with terms ticked goes to /checkout; delete empties the cart', async ({ page, world }) => {
    await seed(page, { session: world.u1, cart: [cartItem(world.products[0], 2)] })
    await page.goto('/cart')
    await page.locator('[data-qa="agree-terms"]').check()
    await page.locator('[data-qa="checkout"]').click()
    await page.waitForURL(/\/checkout$/)
    await page.goto('/cart')
    await page.locator('[data-qa="cart-delete"]').click()
    await expect(page.locator('[data-qa="cart-empty"]')).toBeVisible()
  })
})

test.describe('login', () => {
  test('UI login works; wrong password shows the same error', async ({ page, world }) => {
    await page.goto('/login')
    await page.locator('[data-qa="login-email"]').fill(world.u1.email)
    await page.locator('[data-qa="login-password"]').fill('definitely-wrong')
    await page.locator('[data-qa="login-button"]').click()
    await expect(page.locator('[data-qa="login-error"]')).toHaveText('Your email or password is incorrect!')
    await page.locator('[data-qa="login-password"]').fill(world.u1.password)
    await page.locator('[data-qa="login-button"]').click()
    await page.waitForURL((u) => u.pathname === '/')
    await page.goto('/login')
    await expect(page.locator('[data-qa="account-panel"] [data-qa="logged-user"]')).toContainText(world.u1.email) // header also has a logged-user hook
  })
})

test.describe('checkout', () => {
  test.beforeEach(async ({ page, world }) => {
    await seed(page, { session: world.u1, cart: [cartItem(world.products[0], 2), cartItem(world.products[1], 1)] })
    await page.goto('/checkout')
    await expect(page.locator('[data-qa="checkout-heading"]')).toHaveText('Checkout')
    // the form is prefilled asynchronously from /api/auth/me and would overwrite anything typed before it lands
    await expect(page.locator('[data-qa="addr-email"]')).toHaveValue(world.u1.email)
  })

  test('5 steps in order with their names, Back/Continue navigation', async ({ page }) => {
    const names = ['Address', 'Shipping method', 'Payment method', 'Payment information', 'Confirm order']
    for (let i = 0; i < 5; i++) await expect(page.locator(`[data-qa="step-${i + 1}"]`)).toContainText(names[i])
    await expectQa(page, ['stepper', 'step-address', ...ADDRESS_QA, ...SUMMARY_QA, 'checkout-continue'])
    await expect(page.locator('[data-qa="checkout-back"]')).toHaveCount(0)
    const panels = ['step-address', 'step-shipping', 'step-payment-method', 'step-payment-info', 'step-confirm']
    for (let i = 0; i < 4; i++) {
      if (i === 0) await page.locator('[data-qa="addr-address"]').fill('1 Test Road')
      await page.locator('[data-qa="checkout-continue"]').click()
      await expect(page.locator(`[data-qa="${panels[i + 1]}"]`)).toBeVisible()
    }
    await expectQa(page, ['checkout-back', 'place-order'])
    await expect(page.locator('[data-qa="checkout-continue"]')).toHaveCount(0)
    await page.locator('[data-qa="checkout-back"]').click()
    await expect(page.locator('[data-qa="step-payment-info"]')).toBeVisible()
  })

  test('address validation message', async ({ page }) => {
    await page.locator('[data-qa="addr-name"]').fill('')
    await page.locator('[data-qa="addr-address"]').fill('')
    await page.locator('[data-qa="checkout-continue"]').click()
    await expect(page.locator('[data-qa="checkout-error"]')).toHaveText('Please fill in all required address fields')
    await expect(page.locator('[data-qa="step-address"]')).toBeVisible()
  })

  test('card validation: 16 digits, name, MM/YY, CVV 3–4', async ({ page }) => {
    await page.locator('[data-qa="addr-address"]').fill('1 Test Road')
    await page.locator('[data-qa="checkout-continue"]').click()
    await page.locator('[data-qa="checkout-continue"]').click()
    await page.locator('[data-qa="payment-card"]').click()
    await page.locator('[data-qa="checkout-continue"]').click()
    await expectQa(page, ['step-payment-info', 'card-number', 'card-name', 'card-expiry', 'card-cvv'])
    const err = page.locator('[data-qa="checkout-error"]')
    const next = page.locator('[data-qa="checkout-continue"]')
    const set = (qa, v) => page.locator(`[data-qa="${qa}"]`).fill(v)

    await set('card-number', '4111 1111 1111 111'); await next.click()
    await expect(err).toHaveText('Card number must be 16 digits')
    await set('card-number', CARD.number); await set('card-name', ''); await next.click()
    await expect(err).toHaveText('Please enter the cardholder name')
    await set('card-name', CARD.name); await set('card-expiry', '1230'); await next.click()
    await expect(err).toHaveText('Expiry must be MM/YY')
    await set('card-expiry', CARD.expiry); await set('card-cvv', '12'); await next.click()
    await expect(err).toHaveText('CVV must be 3–4 digits')
    await set('card-cvv', '12345'.slice(0, 4)); await next.click() // maxLength 4 -> "1234" is valid
    await expect(page.locator('[data-qa="step-confirm"]')).toBeVisible()
  })

  test('shipping cost: Ground 0, 2nd Day Air 40, Next Day Air 60, totals follow', async ({ page, world }) => {
    const sub = Number(world.products[0].price) * 2 + Number(world.products[1].price)
    await expect(page.locator('[data-qa="summary-subtotal"]')).toHaveText(`Rs. ${sub}`)
    await expect(page.locator('[data-qa="summary-shipping"]')).toHaveText('Rs. 0') // default Ground
    await page.locator('[data-qa="addr-address"]').fill('1 Test Road')
    await page.locator('[data-qa="checkout-continue"]').click()
    await expect(page.locator('[data-qa="step-shipping"]')).toBeVisible()
    for (const [qa, cost] of [['shipping-2nd-day-air', 40], ['shipping-next-day-air', 60], ['shipping-ground', 0]]) {
      await page.locator(`[data-qa="${qa}"]`).click()
      await expect(page.locator('[data-qa="summary-shipping"]')).toHaveText(`Rs. ${cost}`)
      await expect(page.locator('[data-qa="summary-total"]')).toHaveText(`Rs. ${sub + cost}`)
    }
  })

  test('place order (Ground, cheque) -> /orders/{id}?placed=1, success box, cart cleared, detail unchanged', async ({ page, world }) => {
    const sub = Number(world.products[0].price) * 2 + Number(world.products[1].price)
    const id = await checkoutViaUI(page, { address: { full_name: 'QA Reg One', phone: '0899999999', email: world.u1.email }, shipping: 'Ground', payment: 'Check / Money Order' })
    await expect(page).toHaveURL(new RegExp(`/orders/${id}\\?placed=1$`))
    await expectQa(page, ['order-success', 'order-number', 'order-detail', 'download-invoice', 'order-item', 'order-total'])
    await expect(page.locator('[data-qa="order-success"]')).toContainText('Thank you! Your order has been placed.')
    await expect(page.locator('[data-qa="order-number"]')).toHaveText(`#${id}`)
    const detail = page.locator('[data-qa="order-detail"]')
    await expect(detail).toContainText(`Order #${id}`)
    for (const t of ['Placed on', 'Shipping Address', 'QA Reg One', '1 Test Road', 'Phone: 0899999999', 'Shipping & Payment', 'Shipping: Ground', 'Payment: Check / Money Order', 'Sub-Total', 'Tax']) {
      await expect(detail, t).toContainText(t)
    }
    await expect(detail).not.toContainText('••••')
    await expect(page.locator('[data-qa="order-item"]')).toHaveCount(2)
    await expect(page.locator('[data-qa="order-total"]')).toHaveText(`Rs. ${sub}`)
    await expect(page.locator('body')).not.toContainText('฿') // on-page currency stays Rs.
    await expect(page.getByRole('link', { name: 'Continue Shopping' })).toBeVisible()

    // cart cleared
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('as_cart') || '[]'))).toEqual([])
    await page.goto('/cart')
    await expect(page.locator('[data-qa="cart-empty"]')).toBeVisible()

    // without ?placed=1: same detail, no success box
    await page.goto(`/orders/${id}`)
    await expect(page.locator('[data-qa="order-detail"]')).toBeVisible()
    await expect(page.locator('[data-qa="order-success"]')).toHaveCount(0)
  })

  test('place order (Next Day Air, card) -> shipping 60, status Paid, •••• 1111', async ({ page, world }) => {
    const sub = Number(world.products[0].price) * 2 + Number(world.products[1].price)
    const id = await checkoutViaUI(page, { shipping: 'Next Day Air', payment: 'Credit Card', card: CARD })
    await expect(page.locator('[data-qa="order-success"]')).toContainText('Thank you! Your order has been placed.')
    await expect(page.locator('[data-qa="order-detail"]')).toContainText('Shipping: Next Day Air')
    await expect(page.locator('[data-qa="order-detail"]')).toContainText('Payment: Credit Card (•••• 1111)')
    await expect(page.locator('[data-qa="order-detail"]')).toContainText('Status: Paid')
    await expect(page.locator('[data-qa="order-total"]')).toHaveText(`Rs. ${sub + 60}`)
    expect(id).toBeGreaterThan(0)
  })
})

test.describe('My Orders', () => {
  test('original columns, row hooks and View still work', async ({ page, world }) => {
    await seed(page, { session: world.u1 })
    await page.goto('/orders')
    await expectQa(page, ['orders-heading', 'orders-table', 'order-row', 'order-id', 'order-status', 'view-order'])
    const heads = await page.locator('[data-qa="orders-table"] thead th').allTextContents() // innerText would be upper-cased by CSS
    expect(heads.slice(0, 5).map((h) => h.trim())).toEqual(['Order', 'Date', 'Items', 'Total', 'Status'])
    const order = world.orders.single
    const row = page.locator(`[data-qa="order-row"][data-order-id="${order.id}"]`)
    await expect(row.locator('[data-qa="order-id"]')).toHaveText(`#${order.id}`)
    await expect(row.locator('td').nth(3)).toHaveText(`Rs. ${Number(order.total)}`)
    await expect(row.locator('[data-qa="order-status"]')).toHaveText(order.status)
    await row.locator('[data-qa="view-order"]').click()
    await page.waitForURL(new RegExp(`/orders/${order.id}$`))
    await expect(page.locator('[data-qa="order-detail"]')).toBeVisible()
  })
})
