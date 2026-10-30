// Spec §6 cases 8–11 at UI level + §3.1 button behaviour. Replaces the old
// "Download / Print Invoice" check (there was none in the repo) per the intended change in §7.
const { test, expect } = require('./fixtures')
const { seed, clickAndDownload } = require('./helpers/ui')
const { readPdf } = require('./helpers/pdf')
const { baht, stripWs } = require('./helpers/format')

// 'Rs. 1,500' / 'Rs. 99.5' -> number (strip the currency label first, its dot is not a decimal point)
const rs = (txt) => Number(txt.replace(/^\s*Rs\.?\s*/i, '').replace(/,/g, ''))

test.describe('order detail button (download-invoice)', () => {
  for (const placed of [false, true]) {
    test(`#9 label, filename, no window.print (${placed ? 'with' : 'without'} ?placed=1)`, async ({ page, world }) => {
      const order = world.orders.single
      await page.addInitScript(() => { window.__printCalls = 0; window.print = () => { window.__printCalls++ } })
      await seed(page, { session: world.u1 })
      await page.goto(`/orders/${order.id}${placed ? '?placed=1' : ''}`)
      const btn = page.locator('[data-qa="download-invoice"]')
      await expect(btn).toBeVisible()
      await expect(btn).toHaveText('Download PDF')
      await expect(btn).not.toContainText('Print')
      const { filename, buffer } = await clickAndDownload(page, btn)
      expect(filename).toBe(`order-${order.id}.pdf`)
      expect(buffer.subarray(0, 5).toString()).toBe('%PDF-')
      expect(await page.evaluate(() => window.__printCalls)).toBe(0)
      if (placed) await expect(page.locator('[data-qa="order-success"]')).toBeVisible()
    })
  }

  test('#9 shows "Generating…" and is disabled while the file is built', async ({ page, world }) => {
    const order = world.orders.single
    await page.route('**/api/orders/*/pdf', async (route) => { await new Promise((r) => setTimeout(r, 2500)); await route.continue() })
    await seed(page, { session: world.u1 })
    await page.goto(`/orders/${order.id}`)
    const btn = page.locator('[data-qa="download-invoice"]')
    const dl = page.waitForEvent('download')
    await btn.click()
    await expect(btn).toHaveText('Generating…')
    await expect(btn).toBeDisabled()
    expect((await dl).suggestedFilename()).toBe(`order-${order.id}.pdf`)
    await expect(btn).toHaveText('Download PDF')
    await expect(btn).toBeEnabled()
  })

  test('§5 generation failure shows pdf-error and the button can be retried', async ({ page, world }) => {
    const order = world.orders.single
    await page.route('**/api/orders/*/pdf', (route) => route.fulfill({ status: 500, contentType: 'application/json', body: '{"success":false,"error":"boom"}' }))
    await seed(page, { session: world.u1 })
    await page.goto(`/orders/${order.id}`)
    const btn = page.locator('[data-qa="download-invoice"]')
    await btn.click()
    await expect(page.locator('[data-qa="pdf-error"]')).toHaveText('Could not generate PDF. Please try again.')
    await expect(btn).toBeEnabled()
    await page.unroute('**/api/orders/*/pdf')
    const { filename } = await clickAndDownload(page, btn)
    expect(filename).toBe(`order-${order.id}.pdf`)
  })

  test('#8 every number on the page appears in the PDF as ฿ with thousands separators', async ({ page, world }) => {
    const order = world.orders.multiCard
    await seed(page, { session: world.u1 })
    await page.goto(`/orders/${order.id}`)
    await expect(page.locator('[data-qa="order-item"]').first()).toBeVisible()
    const rows = await page.locator('[data-qa="order-item"]').evaluateAll((trs) => trs.map((tr) => [...tr.children].map((td) => td.textContent.trim())))
    const sums = await page.locator('.sum-row').evaluateAll((els) => els.map((e) => [...e.children].map((c) => c.textContent.trim())))
    const { buffer } = await clickAndDownload(page, page.locator('[data-qa="download-invoice"]'))
    const pdf = await readPdf(buffer)

    expect(rows.length).toBe(order.items.length)
    for (const [name, price, qty, total] of rows) {
      const line = pdf.lines.map(stripWs).find((l) => l.includes(stripWs(name).slice(0, 18)) && l.includes(baht(rs(total))))
      expect(line, `row "${name}"`).toBeTruthy()
      expect(line).toContain(baht(rs(price)))
      expect(line).toContain(String(qty))
    }
    const byLabel = Object.fromEntries(sums.map(([k, v]) => [k, rs(v)]))
    for (const label of ['Sub-Total', 'Shipping', 'Tax', 'Total']) expect(byLabel[label], label).not.toBeNaN()
    for (const label of ['Sub-Total', 'Shipping', 'Tax', 'Total']) expect(pdf.norm, `${label} ${baht(byLabel[label])}`).toContain(baht(byLabel[label]))
    expect(await page.locator('[data-qa="order-total"]').innerText()).toBe(`Rs. ${byLabel.Total}`)
  })
})

test.describe('My Orders (order-pdf)', () => {
  test('#10 a PDF button on every row, next to View, downloading that row\'s order', async ({ page, world }) => {
    await seed(page, { session: world.u1 })
    await page.goto('/orders')
    const rowsLoc = page.locator('[data-qa="order-row"]')
    await expect(rowsLoc.first()).toBeVisible()
    const n = await rowsLoc.count()
    expect(n).toBeGreaterThanOrEqual(2)
    for (let i = 0; i < n; i++) {
      const row = rowsLoc.nth(i)
      await expect(row.locator('[data-qa="order-pdf"]'), `row ${i}`).toHaveText('PDF')
      await expect(row.locator('[data-qa="view-order"]')).toBeVisible()
    }
    // download the first and last row, check the file belongs to that row
    for (const i of [0, n - 1]) {
      const row = rowsLoc.nth(i)
      const id = await row.getAttribute('data-order-id')
      const { filename, buffer } = await clickAndDownload(page, row.locator('[data-qa="order-pdf"]'))
      expect(filename).toBe(`order-${id}.pdf`)
      const pdf = await readPdf(buffer)
      expect(pdf.norm).toContain(stripWs(`เลขที่คำสั่งซื้อ #${id}`))
    }
  })

  test('#10 My Orders PDF equals the order-detail PDF content', async ({ page, world }) => {
    const order = world.orders.multiCard
    await seed(page, { session: world.u1 })
    await page.goto('/orders')
    const a = await clickAndDownload(page, page.locator(`[data-qa="order-row"][data-order-id="${order.id}"] [data-qa="order-pdf"]`))
    await page.goto(`/orders/${order.id}`)
    const b = await clickAndDownload(page, page.locator('[data-qa="download-invoice"]'))
    expect(a.filename).toBe(b.filename)
    const strip = (t) => t.replace(/สร้างเอกสารเมื่อ:?[^\n]*/g, '')
    expect(strip((await readPdf(a.buffer)).text)).toBe(strip((await readPdf(b.buffer)).text))
  })
})

test.describe('access control in the UI', () => {
  test('#11 not logged in: no download on order detail', async ({ page, world }) => {
    await page.goto(`/orders/${world.orders.single.id}`)
    const redirected = /\/login/.test(page.url())
    if (!redirected) await expect(page.locator('[data-qa="order-error"]')).toBeVisible()
    await expect(page.locator('[data-qa="download-invoice"]')).toHaveCount(0)
  })

  test('#11 not logged in: My Orders sends you to login, no PDF buttons', async ({ page }) => {
    await page.goto('/orders')
    await page.waitForURL(/\/login/)
    await expect(page.locator('[data-qa="order-pdf"]')).toHaveCount(0)
  })

  test('#11 another user\'s order: error, no download', async ({ page, world }) => {
    await seed(page, { session: world.u2 })
    await page.goto(`/orders/${world.orders.single.id}`)
    await expect(page.locator('[data-qa="order-error"]')).toBeVisible()
    await expect(page.locator('[data-qa="download-invoice"]')).toHaveCount(0)
  })

  test('#11 non-existent order: error message', async ({ page, world }) => {
    await seed(page, { session: world.u1 })
    await page.goto('/orders/999999999')
    await expect(page.locator('[data-qa="order-error"]')).toBeVisible()
    await expect(page.locator('[data-qa="download-invoice"]')).toHaveCount(0)
  })

  test('#11 user 2 sees none of user 1\'s orders in My Orders', async ({ page, world }) => {
    await seed(page, { session: world.u2 })
    await page.goto('/orders')
    await expect(page.locator('[data-qa="orders-table"], [data-qa="orders-empty"]').first()).toBeVisible()
    await expect(page.locator(`[data-qa="order-row"][data-order-id="${world.orders.single.id}"]`)).toHaveCount(0)
  })
})
