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

// Exact text layer for SARA AM (ำ).
// Sarabun's ccmp splits ำ into NIKHAHIT (or a NIKHAHIT+tone ligature, as in น้ำ) + SARA AA, so a word
// like คำ becomes three glyphs for two characters. pdfkit maps each glyph to text once (first use),
// and fontkit caches code points per glyph id, so out of the box every ำ extracts as ํา (and, worse,
// real า could inherit an empty mapping). A PDF glyph can't map to "no text" either — pdf.js then
// falls back to the raw code. So, per text run:
//   - each glyph's text comes from the font itself (cmap, else its uniXXXX name), not from fontkit;
//   - NIKHAHIT glyphs are matched in order against the ํ / ำ characters of the input. For one that came
//     from ำ, a plain NIKHAHIT is left out of the text and drawn as a vector path from the same outline
//     at the same spot (it has zero advance); a NIKHAHIT+tone ligature stays text but maps to the tone
//     only. The SARA AA right after it maps to U+0E33;
//   - every distinct (glyph, text) pair gets its own code — the subset just holds a duplicate outline.
// The page looks exactly as before and text extracts exactly as written.
const SARA_AM = 0x0e33
const SARA_AA = 0x0e32
const NIKHAHIT = 0x0e4d

function glyphCodePoints(font, glyph, inText) {
  const fromCmap = font.font._cmapProcessor.codePointsForGlyph(glyph.id)
  if (fromCmap.length) return [fromCmap.find((c) => inText.has(c)) ?? fromCmap[0]]
  const m = /^uni((?:[0-9A-F]{4})+)(?:\..*)?$/.exec(glyph.name || '')
  if (m) return m[1].match(/.{4}/g).map((h) => parseInt(h, 16))
  return glyph.codePoints.length ? glyph.codePoints : [0xfffd]
}

function fixToUnicode(font) {
  if (!font || font.__thaiToUnicode || typeof font.encode !== 'function') return
  font.__thaiToUnicode = true
  font.pendingMarks = [] // NIKHAHITs left out of the last encode(), for drawText() to paint
  const codes = new Map() // `${glyphId}:${codePoints}` → PDF code (subset index)

  function codeFor(glyph, cps) {
    const key = `${glyph.id}:${cps.join(',')}`
    let code = codes.get(key)
    if (code === undefined) {
      if (font.subset.mapping[glyph.id] === undefined) {
        code = font.subset.includeGlyph(glyph.id)
      } else {
        font.subset.glyphs.push(glyph.id) // same outline, new code
        code = font.subset.glyphs.length - 1
      }
      codes.set(key, code)
      font.widths[code] = glyph.advanceWidth * font.scale
      font.unicode[code] = cps
    }
    return code
  }

  font.encode = (text, features) => {
    const { glyphs, positions } = font.layout(text, features)
    const chars = Array.from(text, (ch) => ch.codePointAt(0))
    const inText = new Set(chars)
    const nikhahitSources = chars.filter((c) => c === NIKHAHIT || c === SARA_AM) // in input order
    const encoded = []
    const kept = []
    let x = 0 // pen position in 1/1000 em
    let saraAmPending = false
    font.pendingMarks = []
    glyphs.forEach((glyph, i) => {
      const pos = positions[i]
      let cps = glyphCodePoints(font, glyph, inText)
      if (cps.includes(NIKHAHIT) && nikhahitSources.shift() === SARA_AM) {
        cps = cps.filter((c) => c !== NIKHAHIT)
        saraAmPending = true
      } else if (saraAmPending && cps.length === 1 && cps[0] === SARA_AA) {
        cps = [SARA_AM]
        saraAmPending = false
      }
      if (cps.length || pos.xAdvance !== 0) {
        encoded.push(`0000${codeFor(glyph, cps.length ? cps : [0xfffd]).toString(16)}`.slice(-4))
        kept.push(pos)
      } else {
        font.pendingMarks.push({ glyph, x: x + pos.xOffset, y: pos.yOffset })
      }
      x += pos.xAdvance
    })
    return [encoded, kept]
  }
}

// doc.text() for a single line at (x, top) plus the NIKHAHIT paths its encode() left out
function drawText(doc, text, x, top) {
  doc.text(text, x, top, { lineBreak: false })
  const font = doc._font
  const marks = font.pendingMarks || []
  if (!marks.length) return
  font.pendingMarks = []
  const size = doc._fontSize
  const k = size / font.font.unitsPerEm
  const baseline = top + (font.ascender / 1000) * size
  for (const m of marks) {
    doc.save()
    doc.translate(x + (m.x / 1000) * size, baseline - (m.y / 1000) * size)
    doc.scale(k, -k)
    doc.path(m.glyph.path.toSVG()).fill()
    doc.restore()
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
      drawText(doc, ln, x + dx, top + i * lh)
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
