const base = require('@playwright/test')
const { BASE_URL, creds } = require('./helpers/env')
const api = require('./helpers/api')

// Worker-scoped data: two logged-in users, the product list, and a fixed set of orders
// created once through the API (so many tests can inspect the same PDFs).
const test = base.test.extend({
  world: [async ({ playwright }, use) => {
    const request = await playwright.request.newContext({ baseURL: BASE_URL })
    const u1 = { ...creds(1), ...(await api.login(request, creds(1))) }
    const u2 = { ...creds(2), ...(await api.login(request, creds(2))) }
    const products = await api.getProducts(request)
    base.expect(products.length, 'need at least 3 products on the site').toBeGreaterThanOrEqual(3)
    const mk = (o) => api.createOrder(request, u1.token, o)
    const item = (p, q = 1) => ({ product_id: p.id, quantity: q })
    const [p1, p2, p3] = products
    const orders = {}

    // case 1: single item, Ground, cheque
    orders.single = await mk({ items: [item(p1)], shipping_method: 'Ground', payment_method: 'Check / Money Order' })
    // case 2: multiple items/quantities, Next Day Air, card ending 1234
    orders.multiCard = await mk({
      items: [item(p1, 2), item(p2, 3), item(p3, 1)], shipping_method: 'Next Day Air',
      payment_method: 'Credit Card', card: { number: '4111 1111 1111 1234' },
    })
    // case 3: one order per shipping method (weekday depends on when the suite runs)
    orders.ground = orders.single
    orders.nextDay = orders.multiCard
    orders.secondDay = await mk({ items: [item(p2)], shipping_method: '2nd Day Air' })
    // case 4: Thai name + address
    orders.thai = await mk({
      items: [item(p1)], shipping_method: 'Ground',
      address: {
        full_name: 'สมชาย ใจดี', address: '99/9 หมู่ 5 ถนนสุขุมวิท แขวงคลองตัน ซอยสวัสดี',
        city: 'คลองเตย', state: 'กรุงเทพมหานคร', zipcode: '10110',
      },
    })
    // case 5: enough lines to need >1 page (repeat products if the catalogue is small)
    orders.many = await mk({ items: Array.from({ length: 45 }, (_, i) => item(products[i % products.length], (i % 4) + 1)) })
    // case 6: no phone (email falls back to the account email on the server)
    orders.noPhone = await mk({ items: [item(p1)], address: { phone: '' } })
    // case 7: very long address/name (product names can't be created from the API)
    orders.long = await mk({
      items: [item(products.reduce((a, b) => (b.name.length > a.name.length ? b : a)))],
      address: {
        full_name: 'Alexandria Bartholomew-Montgomery the Third of Westminster Upon Thames',
        address: 'Building ' + 'A'.repeat(40) + ' Floor 12 Unit 1204, ' + 'Very Long Street Name '.repeat(6) + 'Industrial Estate Phase 2 ' + 'Z'.repeat(60),
        city: 'Bang Rak', state: 'Bangkok', zipcode: '10500',
      },
    })

    await use({ request, u1, u2, products, orders })
    await request.dispose()
  }, { scope: 'worker' }],
})

module.exports = { test, expect: base.expect }
