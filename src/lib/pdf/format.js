// Pure formatting helpers for the order-summary PDF (no I/O, no pdfkit) — unit tested in tests/unit/.

const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000 // Asia/Bangkok is UTC+7 all year (no DST)
const DAY_MS = 24 * 60 * 60 * 1000

// business days after the order date: [first, last] (a range when they differ)
const DELIVERY_DAYS = {
  'Next Day Air': [1, 1],
  '2nd Day Air': [2, 2],
  'Ground': [3, 5],
}

export function isBlank(v) {
  return v === null || v === undefined || String(v).trim() === ''
}

// ---------------------------------------------------------------- money
// ฿1,500 / ฿99.50 / ฿0 — decimals only when the value has a fractional part
export function formatBaht(value) {
  const n = Number(value)
  if (isBlank(value) || !Number.isFinite(n)) return '-'
  const rounded = Math.round(Math.abs(n) * 100) / 100
  const [int, frac] = (Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2)).split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${n < 0 && rounded !== 0 ? '-' : ''}฿${grouped}${frac ? `.${frac}` : ''}`
}

// price × quantity, rounded to satang so float noise never reaches the PDF
export function lineTotal(price, quantity) {
  return Math.round(Number(price) * Number(quantity) * 100) / 100
}

// ---------------------------------------------------------------- dates
// Bangkok calendar parts of an instant: { y, m (0-11), d, hh, mm, dow (0=Sun) }
function bangkokParts(input) {
  const t = input instanceof Date ? input.getTime() : new Date(input).getTime()
  if (isBlank(input) || Number.isNaN(t)) return null
  const b = new Date(t + BANGKOK_OFFSET_MS)
  return {
    y: b.getUTCFullYear(), m: b.getUTCMonth(), d: b.getUTCDate(),
    hh: b.getUTCHours(), mm: b.getUTCMinutes(), dow: b.getUTCDay(),
  }
}

const pad2 = (n) => String(n).padStart(2, '0')
const beYear = (y) => y + 543

// 30 ต.ค. 2569
export function formatThaiDate(input) {
  const p = bangkokParts(input)
  if (!p) return '-'
  return `${p.d} ${TH_MONTHS[p.m]} ${beYear(p.y)}`
}

// 30 ต.ค. 2569 14:05
export function formatThaiDateTime(input) {
  const p = bangkokParts(input)
  if (!p) return '-'
  return `${p.d} ${TH_MONTHS[p.m]} ${beYear(p.y)} ${pad2(p.hh)}:${pad2(p.mm)}`
}

// Bangkok calendar date `days` Mon–Fri days after the order date (public holidays are not skipped)
function addBusinessDays(parts, days) {
  let t = Date.UTC(parts.y, parts.m, parts.d)
  let left = days
  while (left > 0) {
    t += DAY_MS
    const dow = new Date(t).getUTCDay()
    if (dow !== 0 && dow !== 6) left--
  }
  const r = new Date(t)
  return { y: r.getUTCFullYear(), m: r.getUTCMonth(), d: r.getUTCDate() }
}

// 4–6 พ.ย. 2569 / 30 ต.ค. – 3 พ.ย. 2569 / 30 ธ.ค. 2569 – 5 ม.ค. 2570
function formatThaiDateRange(a, b) {
  if (a.y === b.y && a.m === b.m && a.d === b.d) return `${a.d} ${TH_MONTHS[a.m]} ${beYear(a.y)}`
  if (a.y === b.y && a.m === b.m) return `${a.d}–${b.d} ${TH_MONTHS[a.m]} ${beYear(a.y)}`
  if (a.y === b.y) return `${a.d} ${TH_MONTHS[a.m]} – ${b.d} ${TH_MONTHS[b.m]} ${beYear(b.y)}`
  return `${a.d} ${TH_MONTHS[a.m]} ${beYear(a.y)} – ${b.d} ${TH_MONTHS[b.m]} ${beYear(b.y)}`
}

// Expected delivery date text from order time + shipping method; '-' when unknown
export function estimateDelivery(createdAt, shippingMethod) {
  const span = DELIVERY_DAYS[shippingMethod]
  const p = bangkokParts(createdAt)
  if (!span || !p) return '-'
  return formatThaiDateRange(addBusinessDays(p, span[0]), addBusinessDays(p, span[1]))
}

// ---------------------------------------------------------------- address
// Shipping address as printable lines; missing values drop the whole line
export function formatAddressLines(order = {}) {
  const lines = [
    [null, order.full_name],
    [null, order.address],
    ['อำเภอ/เขต', order.city],
    ['จังหวัด', order.state],
    ['รหัสไปรษณีย์', order.zipcode],
    ['ประเทศ', order.country],
    ['โทร', order.phone],
    ['อีเมล', order.email],
  ]
  return lines
    .filter(([, v]) => !isBlank(v))
    .map(([label, v]) => (label ? `${label}: ${String(v).trim()}` : String(v).trim()))
}

// ---------------------------------------------------------------- text wrapping
// Thai has no spaces between words, so split on dictionary word boundaries
export function splitWords(text) {
  const s = isBlank(text) ? '' : String(text)
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    return [...new Intl.Segmenter('th', { granularity: 'word' }).segment(s)].map((x) => x.segment)
  }
  return s.split(/(\s+)/).filter(Boolean)
}

function splitGraphemes(text) {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    return [...new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(text)].map((x) => x.segment)
  }
  return Array.from(text)
}

// Greedy line wrap: measure(str) → width. Breaks between words; a word wider than
// maxWidth is split between grapheme clusters so vowels/tone marks stay on their base.
export function wrapText(text, maxWidth, measure) {
  const out = []
  for (const para of (isBlank(text) ? '' : String(text)).split(/\r?\n/)) {
    let line = ''
    const pushLine = () => { if (line.trim()) out.push(line.trim()); line = '' }
    for (const word of splitWords(para)) {
      if (measure(line + word) <= maxWidth) { line += word; continue }
      pushLine()
      if (!word.trim()) continue
      if (measure(word) <= maxWidth) { line = word; continue }
      for (const g of splitGraphemes(word)) {
        if (line && measure(line + g) > maxWidth) pushLine()
        line += g
      }
    }
    pushLine()
  }
  return out
}
