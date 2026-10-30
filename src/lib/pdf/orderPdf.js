// Order summary PDF (Thai, A4 portrait) rendered with pdfkit on the server.
// All text is laid out line by line by us (wrapText) because pdfkit's own wrapper
// only breaks on spaces, which Thai doesn't use between words.

import path from 'path'
import PDFDocument from 'pdfkit'
import {
  formatBaht, lineTotal, formatThaiDateTime, estimateDelivery, formatAddressLines, wrapText, isBlank,
} from './format'

const FONT_DIR = path.join(process.cwd(), 'assets', 'fonts')
const FONT_REGULAR = path.join(FONT_DIR, 'Sarabun-Regular.ttf')
const FONT_BOLD = path.join(FONT_DIR, 'Sarabun-Bold.ttf')

const MARGIN = 40
const FOOTER_H = 28
const LINE = 1.45 // line-height factor; Thai stacks marks above and below the base line
const COLOR = { text: '#222222', muted: '#666666', rule: '#cccccc', head: '#f0f0f0' }

// pdfkit writes each glyph's Unicode (ToUnicode CMap) from the first time the glyph is shaped.
// Sarabun's ccmp splits SARA AM (ำ) into NIKHAHIT + SARA AA, and fontkit gives the SARA AA glyph
// no code points — pdfkit then emits an empty entry and every า in the file extracts as garbage.
// Map glyphs to their own cmap code points instead, so ำ extracts as its NFKD form ํ + า.
const SARA_AM = 0x0e33
const NIKHAHIT = 0x0e4d

function fixToUnicode(font) {
  if (!font || font.__thaiToUnicode || typeof font.encode !== 'function') return
  font.__thaiToUnicode = true
  const encode = font.encode.bind(font)
  font.encode = (text, features) => {
    const { glyphs } = font.layout(text, features)
    for (const glyph of glyphs) {
      const gid = font.subset.includeGlyph(glyph.id)
      if (font.unicode[gid] != null) continue
      let cps = glyph.codePoints.map((c) => (c === SARA_AM ? NIKHAHIT : c)) // the า half is its own glyph
      if (!cps.length) cps = font.font._cmapProcessor.codePointsForGlyph(glyph.id)
      font.unicode[gid] = cps.length ? cps : [0xfffd]
    }
    return encode(text, features)
  }
}

export function buildOrderPdf(order, { now = new Date() } = {}) {
  const doc = new PDFDocument({
    size: 'A4', layout: 'portrait', margin: MARGIN, bufferPages: true, font: FONT_REGULAR,
    info: { Title: `ใบสรุปคำสั่งซื้อ #${order.id}`, Author: 'AutomationStore' },
  })
  doc.registerFont('regular', FONT_REGULAR)
  doc.registerFont('bold', FONT_BOLD)
  for (const name of ['regular', 'bold']) fixToUnicode(doc.font(name)._font)

  const done = new Promise((resolve, reject) => {
    const chunks = []
    doc.on('data', (c) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  const left = MARGIN
  const width = doc.page.width - MARGIN * 2
  const bottom = doc.page.height - MARGIN - FOOTER_H
  let y = MARGIN

  // draws wrapped text inside [x, x+w] and returns its height; align: left | right
  function block(text, x, top, w, { font = 'regular', size = 10, color = COLOR.text, align = 'left' } = {}) {
    doc.font(font).fontSize(size).fillColor(color)
    const lines = wrapText(text, w, (s) => doc.widthOfString(s))
    const lh = size * LINE
    lines.forEach((ln, i) => {
      const dx = align === 'right' ? w - doc.widthOfString(ln) : 0
      doc.text(ln, x + dx, top + i * lh, { lineBreak: false })
    })
    return lines.length * lh
  }
  function measure(text, w, { font = 'regular', size = 10 } = {}) {
    doc.font(font).fontSize(size)
    return wrapText(text, w, (s) => doc.widthOfString(s)).length * size * LINE
  }
  function rule(atY) {
    doc.moveTo(left, atY).lineTo(left + width, atY).lineWidth(0.5).strokeColor(COLOR.rule).stroke()
  }

  // ---------------------------------------------------------------- header
  block('ใบสรุปคำสั่งซื้อ', left, y, width / 2, { font: 'bold', size: 20 })
  block('AutomationStore', left + width / 2, y, width / 2, { font: 'bold', size: 14, align: 'right' })
  block(`เลขที่คำสั่งซื้อ #${order.id}`, left + width / 2, y + 22, width / 2, { size: 11, align: 'right' })
  y += 44
  rule(y)
  y += 8
  y += block(`วันที่สั่งซื้อ: ${formatThaiDateTime(order.created_at)}`, left, y, width)
  if (!isBlank(order.status)) y += block(`สถานะ: ${order.status}`, left, y, width)
  y += 10

  // ---------------------------------------------------------------- address | shipping + payment
  const gap = 20
  const colW = (width - gap) / 2
  const rightX = left + colW + gap

  let ly = y
  ly += block('ที่อยู่จัดส่ง', left, ly, colW, { font: 'bold', size: 12 })
  for (const ln of formatAddressLines(order)) ly += block(ln, left, ly, colW)

  let ry = y
  ry += block('การจัดส่ง', rightX, ry, colW, { font: 'bold', size: 12 })
  if (!isBlank(order.shipping_method)) ry += block(`วิธีจัดส่ง: ${order.shipping_method}`, rightX, ry, colW)
  ry += block(`ค่าจัดส่ง: ${formatBaht(order.shipping_cost ?? 0)}`, rightX, ry, colW)
  ry += block(`วันที่คาดว่าจะได้รับ: ${estimateDelivery(order.created_at, order.shipping_method)}`, rightX, ry, colW)
  ry += 8
  ry += block('การชำระเงิน', rightX, ry, colW, { font: 'bold', size: 12 })
  const card = isBlank(order.card_last4) ? '' : ` •••• ${order.card_last4}`
  ry += block(`วิธีชำระเงิน: ${isBlank(order.payment_method) ? '-' : order.payment_method}${card}`, rightX, ry, colW)

  y = Math.max(ly, ry) + 14

  // ---------------------------------------------------------------- items table
  const cols = [
    { title: 'ลำดับ', w: 40, align: 'left' },
    { title: 'สินค้า', w: width - 40 - 90 - 50 - 90, align: 'left' },
    { title: 'ราคาต่อหน่วย', w: 90, align: 'right' },
    { title: 'จำนวน', w: 50, align: 'right' },
    { title: 'รวม', w: 90, align: 'right' },
  ]
  const PAD = 4
  const cellW = (c) => c.w - PAD * 2

  function drawRow(values, opts) {
    const h = Math.max(...cols.map((c, i) => measure(values[i], cellW(c), opts))) + PAD * 2
    if (opts.fill) doc.rect(left, y, width, h).fill(opts.fill)
    let x = left
    cols.forEach((c, i) => {
      block(values[i], x + PAD, y + PAD, cellW(c), { ...opts, align: c.align })
      x += c.w
    })
    y += h
    rule(y)
  }
  function rowHeight(values, opts) {
    return Math.max(...cols.map((c, i) => measure(values[i], cellW(c), opts))) + PAD * 2
  }
  const headOpts = { font: 'bold', size: 10, fill: COLOR.head }
  const drawHead = () => drawRow(cols.map((c) => c.title), headOpts)

  if (y + measure('รายการสินค้า', width, { size: 12 }) + rowHeight(cols.map((c) => c.title), headOpts) * 2 > bottom) {
    doc.addPage()
    y = MARGIN
  }
  y += block('รายการสินค้า', left, y, width, { font: 'bold', size: 12 })
  y += 4
  drawHead()

  const items = order.items || []
  items.forEach((it, idx) => {
    const values = [
      String(idx + 1),
      isBlank(it.name) ? '-' : String(it.name),
      formatBaht(it.price),
      String(it.quantity ?? ''),
      formatBaht(lineTotal(it.price, it.quantity)),
    ]
    if (y + rowHeight(values, {}) > bottom) {
      doc.addPage()
      y = MARGIN
      drawHead()
    }
    drawRow(values, {})
  })

  // ---------------------------------------------------------------- totals (after the last item)
  const sums = [
    ['ยอดรวมสินค้า', order.subtotal],
    ['ค่าจัดส่ง', order.shipping_cost ?? 0],
    ['ภาษี', order.tax ?? 0],
    ['ยอดสุทธิ', order.total],
  ]
  const sumW = 240
  const sumX = left + width - sumW
  const sumRowH = 12 * LINE + 2
  y += 10
  if (y + sums.length * sumRowH > bottom) {
    doc.addPage()
    y = MARGIN
  }
  sums.forEach(([label, val], i) => {
    const last = i === sums.length - 1
    const opts = last ? { font: 'bold', size: 12 } : { size: 10 }
    if (last) {
      doc.moveTo(sumX, y).lineTo(sumX + sumW, y).lineWidth(0.5).strokeColor(COLOR.rule).stroke()
      y += 3
    }
    block(label, sumX, y, sumW / 2, opts)
    block(formatBaht(val), sumX + sumW / 2, y, sumW / 2, { ...opts, align: 'right' })
    y += sumRowH
  })

  // ---------------------------------------------------------------- footer on every page
  const generated = `สร้างเอกสารเมื่อ: ${formatThaiDateTime(now)}`
  const range = doc.bufferedPageRange()
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i)
    const fy = doc.page.height - MARGIN - 12
    rule(fy - 6)
    block(generated, left, fy, width / 2, { size: 9, color: COLOR.muted })
    block(`หน้า ${i + 1} / ${range.count}`, left + width / 2, fy, width / 2, { size: 9, color: COLOR.muted, align: 'right' })
  }

  doc.end()
  return done
}
