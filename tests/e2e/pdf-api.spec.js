// Spec §6 cases 1–8, 11, 12 at API level: GET /api/orders/{id}/pdf checked against GET /api/orders/{id}.
const { test, expect } = require('./fixtures')
const { getPdf } = require('./helpers/api')
const { readPdf, overflowProblems, lineWith } = require('./helpers/pdf')
const { baht, thaiDateTime, expectedDelivery, deliveryMatches, bangkok, stripWs } = require('./helpers/format')

const HEADINGS = [
  'ใบสรุปคำสั่งซื้อ', 'AutomationStore', 'วันที่สั่งซื้อ:', 'สถานะ:', 'ที่อยู่จัดส่ง', 'การจัดส่ง',
  'วิธีจัดส่ง:', 'ค่าจัดส่ง:', 'วันที่คาดว่าจะได้รับ:', 'การชำระเงิน', 'วิธีชำระเงิน:', 'รายการสินค้า',
  'ลำดับ', 'สินค้า', 'ราคาต่อหน่วย', 'จำนวน', 'รวม', 'ยอดรวมสินค้า', 'ภาษี', 'ยอดสุทธิ', 'สร้างเอกสารเมื่อ:',
]

async function fetchPdf({ request, u1 }, order) {
  const res = await getPdf(request, u1.token, order.id)
  expect(res.status(), `PDF for order ${order.id}`).toBe(200)
  const buffer = await res.body()
  return { res, buffer, pdf: await readPdf(buffer) }
}

// checks every PDF must pass (§4.1, §4.2, §4.3)
function expectCommon(pdf, order) {
  for (const h of HEADINGS) expect(pdf.norm, `heading "${h}"`).toContain(stripWs(h))
  expect(pdf.norm).toContain(stripWs(`เลขที่คำสั่งซื้อ #${order.id}`))
  expect(pdf.norm).toContain(stripWs(`วันที่สั่งซื้อ: ${thaiDateTime(order.created_at)}`))
  expect(pdf.norm).toContain(stripWs(`สถานะ: ${order.status}`))
  expect(pdf.norm).toContain(stripWs(order.shipping_method))
  expect(pdf.norm).toContain(stripWs(order.payment_method))
  // money: ฿ prefix, thousands separators, same numbers as the API/web
  for (const v of [order.subtotal, order.shipping_cost, order.tax, order.total]) {
    expect(pdf.norm, `amount ${baht(v)}`).toContain(baht(v))
  }
  expect(lineWith(pdf, 'ยอดสุทธิ')).toContain(baht(order.total))
  for (const it of order.items) {
    const row = pdf.lines.map(stripWs).find((l) => l.includes(stripWs(it.name).slice(0, 18)) && l.includes(baht(Number(it.price) * it.quantity)))
    expect(row, `row for "${it.name}" x${it.quantity}`).toBeTruthy()
    expect(row).toContain(baht(it.price))
  }
  expect(pdf.norm).not.toMatch(/undefined|null|NaN/i)
  expect(pdf.norm).not.toContain('Rs.')
  expect(overflowProblems(pdf), 'nothing outside A4 page').toEqual([])
}

test.describe('PDF content', () => {
  test('#1 single item, Ground, Check/Money Order: Thai headings, no card, delivery range', async ({ world }) => {
    const order = world.orders.single
    const { pdf } = await fetchPdf(world, order)
    expectCommon(pdf, order)
    expect(pdf.norm).not.toContain('••••')
    expect(pdf.norm).not.toMatch(/\d{4}\d{4}\d{4}\d{4}/)
    const exp = expectedDelivery(order.created_at, 'Ground')
    expect(deliveryMatches(lineWith(pdf, 'วันที่คาดว่าจะได้รับ:'), exp)).toBe(true)
    expect(lineWith(pdf, 'วันที่คาดว่าจะได้รับ:')).toMatch(/[–-]/) // a range, not a single day
  })

  test('#2 multi items, Next Day Air, Credit Card: totals, •••• 1234, no full card number', async ({ world }) => {
    const order = world.orders.multiCard
    expect(order.card_last4).toBe('1234')
    const { pdf, buffer } = await fetchPdf(world, order)
    expectCommon(pdf, order)
    expect(pdf.norm).toContain('••••1234')
    expect(pdf.text, 'spec §4.1: "•••• {card_last4}" with a space (norm strips spaces, so check raw text)').toContain('•••• 1234')
    for (const leak of ['4111111111111234', '4111', '1111']) expect(pdf.norm).not.toContain(leak)
    expect(buffer.toString('latin1')).not.toContain('4111')
    // row = price × quantity and grand total = sum
    const sum = order.items.reduce((s, i) => s + Number(i.price) * i.quantity, 0)
    expect(Number(order.subtotal)).toBe(sum)
    expect(Number(order.total)).toBe(sum + Number(order.shipping_cost) + Number(order.tax))
  })

  for (const [key, method] of [['ground', 'Ground'], ['secondDay', '2nd Day Air'], ['nextDay', 'Next Day Air']]) {
    test(`#3 delivery date skips weekends: ${method}`, async ({ world }) => {
      const order = world.orders[key]
      expect(order.shipping_method).toBe(method)
      const { pdf } = await fetchPdf(world, order)
      const exp = expectedDelivery(order.created_at, method)
      const line = lineWith(pdf, 'วันที่คาดว่าจะได้รับ:')
      expect(deliveryMatches(line, exp), `got "${line}"`).toBe(true)
      // when the suite happens to run on a Friday, also pin the literal table of spec §4.4
      const base = bangkok(order.created_at)
      const dow = new Date(Date.UTC(base.y, base.m - 1, base.d)).getUTCDay()
      test.info().annotations.push({ type: 'order-weekday', description: `placed on weekday ${dow} (5 = Friday)` })
      if (dow === 5 && base.y === 2026 && base.m === 10 && base.d === 30) {
        const lit = { 'Next Day Air': '2พ.ย.2569', '2nd Day Air': '3พ.ย.2569', Ground: '4–6พ.ย.2569' }[method]
        expect(stripWs(line).replace(/[-‐-―]/g, '–')).toContain(lit)
      }
    })
  }

  test('#4 Thai name and address are readable', async ({ world }) => {
    const order = world.orders.thai
    const { pdf, buffer } = await fetchPdf(world, order)
    expectCommon(pdf, order)
    for (const v of [order.full_name, order.address, order.city, order.state, order.zipcode]) {
      expect(pdf.norm, `Thai value "${v}"`).toContain(stripWs(v))
    }
    expect(pdf.norm).not.toContain('�')
    // a font that has Thai glyphs must be embedded (visual check of tofu/mark placement stays manual)
    expect(buffer.toString('latin1')).toMatch(/\/FontFile[23]?\b/)
  })

  test('#5 many items: >1 page, header repeats, page numbers, summary at the end', async ({ world }) => {
    const order = world.orders.many
    const { pdf } = await fetchPdf(world, order)
    expect(pdf.numpages).toBeGreaterThanOrEqual(2)
    pdf.pages.forEach((p, i) => {
      const t = stripWs(p.text)
      expect(t, `page ${i + 1} table header`).toContain('ราคาต่อหน่วย')
      expect(t, `page ${i + 1} header cols`).toContain('จำนวน')
      expect(t, `page ${i + 1} number`).toContain(`หน้า${i + 1}/${pdf.numpages}`)
      if (i < pdf.numpages - 1) expect(t, `summary only on last page`).not.toContain('ยอดสุทธิ')
    })
    const last = stripWs(pdf.pages.at(-1).text)
    expect(last).toContain('ยอดสุทธิ')
    expect(last).toContain(baht(order.total))
    const lastItem = stripWs(order.items.at(-1).name).slice(0, 18)
    expect(pdf.norm.lastIndexOf(lastItem), 'summary after the last item').toBeLessThan(pdf.norm.indexOf('ยอดรวมสินค้า'))
    expect(overflowProblems(pdf)).toEqual([])
    expect(pdf.norm).not.toMatch(/undefined|null|NaN/i)
  })

  test('#6 no phone: no empty line, no undefined/null', async ({ world }) => {
    const order = world.orders.noPhone
    expect(order.phone || '').toBe('')
    const { pdf } = await fetchPdf(world, order)
    expectCommon(pdf, order)
    expect(pdf.norm).not.toContain('โทร:')
    // email falls back to the account email on the server, so the email line is still shown
    expect(pdf.norm).toContain(stripWs(`อีเมล: ${order.email}`))
    expect(pdf.norm).not.toMatch(/(โทร|อีเมล):(?!\S)/)
  })

  test('#6b phone present: shown as "โทร: …"', async ({ world }) => {
    const { pdf } = await fetchPdf(world, world.orders.single)
    expect(pdf.norm).toContain(stripWs(`โทร: ${world.orders.single.phone}`))
  })

  test('#7 very long name/address wrap inside the page', async ({ world }) => {
    const order = world.orders.long
    const { pdf } = await fetchPdf(world, order)
    expectCommon(pdf, order)
    expect(pdf.norm).toContain(stripWs(order.full_name))
    expect(pdf.norm).toContain('Z'.repeat(60)) // unbroken long token must still fit/wrap, not vanish
    expect(overflowProblems(pdf)).toEqual([])
  })

  test('#8 amounts in file equal amounts from the order API (see pdf-ui for on-page comparison)', async ({ world }) => {
    for (const key of ['single', 'multiCard', 'many']) {
      const order = world.orders[key]
      const { pdf } = await fetchPdf(world, order)
      for (const v of [order.subtotal, order.shipping_cost, order.tax, order.total]) expect(pdf.norm).toContain(baht(v))
    }
  })

  test('footer "สร้างเอกสารเมื่อ" is the current Thai (BE, Bangkok) time', async ({ world }) => {
    const { pdf } = await fetchPdf(world, world.orders.single)
    const now = Date.now()
    const ok = [0, 1, 2, 3].some((m) => pdf.norm.includes(stripWs(`สร้างเอกสารเมื่อ: ${thaiDateTime(now - m * 60_000)}`)))
    expect(ok, lineWith(pdf, 'สร้างเอกสารเมื่อ:')).toBe(true)
  })
})

test.describe('PDF endpoint', () => {
  test('#12 headers: application/pdf, attachment, order-{id}.pdf, %PDF body', async ({ world }) => {
    const order = world.orders.single
    const res = await getPdf(world.request, world.u1.token, order.id)
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain('application/pdf')
    expect(res.headers()['content-disposition']).toMatch(new RegExp(`^attachment;\\s*filename="?order-${order.id}\\.pdf"?`))
    const body = await res.body()
    expect(body.subarray(0, 5).toString()).toBe('%PDF-')
    expect(body.length).toBeGreaterThan(1000)
  })

  test('#11 not logged in -> 401, no file', async ({ world }) => {
    const res = await getPdf(world.request, null, world.orders.single.id)
    expect(res.status()).toBe(401)
    expect(res.headers()['content-type'] || '').not.toContain('application/pdf')
  })

  test('#11 invalid token -> 401', async ({ world }) => {
    const res = await getPdf(world.request, 'not-a-real-token', world.orders.single.id)
    expect(res.status()).toBe(401)
  })

  test('#11 another user\'s order -> 403/404, no file', async ({ world }) => {
    const res = await getPdf(world.request, world.u2.token, world.orders.single.id)
    expect([403, 404]).toContain(res.status())
    expect(res.headers()['content-type'] || '').not.toContain('application/pdf')
  })

  test('#11 non-existent order id -> 404', async ({ world }) => {
    const res = await getPdf(world.request, world.u1.token, 999999999)
    expect(res.status()).toBe(404)
  })

  test('#11 malformed id -> 400/404 (same as GET /api/orders/{id}: 400)', async ({ world }) => {
    const res = await getPdf(world.request, world.u1.token, 'abc')
    expect([400, 404]).toContain(res.status())
  })
})
