// Independent reference implementation of the spec's formatting rules (§4.2–4.4).
// Deliberately NOT imported from app code: tests must check the app against the spec.
const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

function baht(n) {
  n = Number(n)
  const dec = Math.abs(n % 1) > 1e-9
  return '฿' + n.toLocaleString('en-US', { minimumFractionDigits: dec ? 2 : 0, maximumFractionDigits: dec ? 2 : 0 })
}

// calendar parts of an instant in Asia/Bangkok
function bangkok(input) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(input))
  const g = (t) => Number(parts.find((p) => p.type === t).value)
  return { y: g('year'), m: g('month'), d: g('day'), hh: g('hour'), mm: g('minute') }
}

const pad = (n) => String(n).padStart(2, '0')
const dmy = ({ y, m, d }) => `${d} ${TH_MONTHS[m - 1]} ${y + 543}`
const thaiDateTime = (input) => { const p = bangkok(input); return `${dmy(p)} ${pad(p.hh)}:${pad(p.mm)}` }

// Mon–Fri only, public holidays NOT skipped (spec §9 #4)
function addBusinessDays({ y, m, d }, n) {
  const t = new Date(Date.UTC(y, m - 1, d))
  let left = n
  while (left > 0) {
    t.setUTCDate(t.getUTCDate() + 1)
    const dow = t.getUTCDay()
    if (dow !== 0 && dow !== 6) left--
  }
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }
}

// returns { start, end } (equal for single-day methods) or null for unknown method
function expectedDelivery(createdAt, method) {
  const base = bangkok(createdAt)
  if (method === 'Next Day Air') { const x = addBusinessDays(base, 1); return { start: x, end: x } }
  if (method === '2nd Day Air') { const x = addBusinessDays(base, 2); return { start: x, end: x } }
  if (method === 'Ground') return { start: addBusinessDays(base, 3), end: addBusinessDays(base, 5) }
  return null
}

const stripWs = (s) => s.replace(/\s+/g, '')
const dashes = (s) => s.replace(/[-‐-―−]/g, '–')

// `line` = extracted text of the "expected delivery" line. Spec §4.4 gives the format
// `4–6 พ.ย. 2569` for same-month ranges; cross-month range format is unspecified,
// so there we only require both endpoints' day numbers and the end date in full.
function deliveryMatches(line, exp) {
  const s = dashes(stripWs(line))
  const { start, end } = exp
  if (start.d === end.d && start.m === end.m) return s.includes(stripWs(dmy(start)))
  if (start.m === end.m && start.y === end.y) return s.includes(`${start.d}–${stripWs(dmy(end))}`)
  return s.includes(stripWs(dmy(end))) && s.includes(String(start.d))
}

module.exports = { TH_MONTHS, baht, bangkok, dmy, thaiDateTime, addBusinessDays, expectedDelivery, deliveryMatches, stripWs }
