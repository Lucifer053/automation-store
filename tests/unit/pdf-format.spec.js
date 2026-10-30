import { test, expect } from '@playwright/test'
import {
  formatBaht, lineTotal, formatThaiDate, formatThaiDateTime, estimateDelivery, formatAddressLines, wrapText,
} from '../../src/lib/pdf/format'

// Friday 30 Oct 2026 14:05 Asia/Bangkok
const FRI = '2026-10-30T07:05:00Z'

test.describe('formatBaht', () => {
  test('integer values have no decimals and use thousands separators', () => {
    expect(formatBaht(1500)).toBe('฿1,500')
    expect(formatBaht('1234567')).toBe('฿1,234,567')
    expect(formatBaht(500)).toBe('฿500')
  })
  test('zero shows as ฿0', () => {
    expect(formatBaht(0)).toBe('฿0')
    expect(formatBaht('0.00')).toBe('฿0')
  })
  test('fractional values show 2 decimals', () => {
    expect(formatBaht(99.5)).toBe('฿99.50')
    expect(formatBaht('1500.25')).toBe('฿1,500.25')
    expect(formatBaht(0.1 + 0.2)).toBe('฿0.30')
  })
  test('NUMERIC strings from the API with .00 are treated as integers', () => {
    expect(formatBaht('60.00')).toBe('฿60')
  })
  test('missing or invalid values show "-"', () => {
    expect(formatBaht(null)).toBe('-')
    expect(formatBaht(undefined)).toBe('-')
    expect(formatBaht('abc')).toBe('-')
  })
})

test.describe('lineTotal', () => {
  test('is price × quantity without float noise', () => {
    expect(lineTotal('500', 3)).toBe(1500)
    expect(lineTotal(0.1, 3)).toBe(0.3)
    expect(formatBaht(lineTotal('19.99', 3))).toBe('฿59.97')
  })
})

test.describe('Thai dates', () => {
  test('format with short Thai month, Buddhist year and Bangkok time', () => {
    expect(formatThaiDateTime(FRI)).toBe('30 ต.ค. 2569 14:05')
    expect(formatThaiDate(FRI)).toBe('30 ต.ค. 2569')
  })
  test('convert UTC to Asia/Bangkok across the date line', () => {
    // 31 Dec 2026 18:30 UTC = 1 Jan 2027 01:30 Bangkok
    expect(formatThaiDateTime('2026-12-31T18:30:00Z')).toBe('1 ม.ค. 2570 01:30')
  })
  test('zero-pads hours and minutes', () => {
    expect(formatThaiDateTime('2026-01-04T23:07:00Z')).toBe('5 ม.ค. 2569 06:07')
  })
  test('invalid input shows "-"', () => {
    expect(formatThaiDateTime(null)).toBe('-')
    expect(formatThaiDate('not a date')).toBe('-')
  })
})

test.describe('estimateDelivery', () => {
  test('spec 4.4 example: ordered Friday 30 Oct 2569', () => {
    expect(estimateDelivery(FRI, 'Next Day Air')).toBe('2 พ.ย. 2569')
    expect(estimateDelivery(FRI, '2nd Day Air')).toBe('3 พ.ย. 2569')
    expect(estimateDelivery(FRI, 'Ground')).toBe('4–6 พ.ย. 2569')
  })
  test('weekday order without crossing a weekend', () => {
    // Monday 2 Nov 2026 10:00 Bangkok
    const mon = '2026-11-02T03:00:00Z'
    expect(estimateDelivery(mon, 'Next Day Air')).toBe('3 พ.ย. 2569')
    expect(estimateDelivery(mon, '2nd Day Air')).toBe('4 พ.ย. 2569')
    expect(estimateDelivery(mon, 'Ground')).toBe('5–9 พ.ย. 2569')
  })
  test('weekend orders count from the next business day', () => {
    // Saturday 31 Oct 2026 / Sunday 1 Nov 2026
    expect(estimateDelivery('2026-10-31T05:00:00Z', 'Next Day Air')).toBe('2 พ.ย. 2569')
    expect(estimateDelivery('2026-11-01T05:00:00Z', '2nd Day Air')).toBe('3 พ.ย. 2569')
  })
  test('uses the Bangkok calendar date, not UTC', () => {
    // Thu 29 Oct 2026 20:00 UTC = Fri 30 Oct 03:00 Bangkok
    expect(estimateDelivery('2026-10-29T20:00:00Z', 'Next Day Air')).toBe('2 พ.ย. 2569')
  })
  test('Ground range across months and years', () => {
    // Tue 27 Oct 2026 → 30 Oct – 3 Nov
    expect(estimateDelivery('2026-10-27T03:00:00Z', 'Ground')).toBe('30 ต.ค. – 3 พ.ย. 2569')
    // Mon 28 Dec 2026 → 31 Dec 2026 – 4 Jan 2027
    expect(estimateDelivery('2026-12-28T03:00:00Z', 'Ground')).toBe('31 ธ.ค. 2569 – 4 ม.ค. 2570')
  })
  test('unknown shipping method or bad date shows "-"', () => {
    expect(estimateDelivery(FRI, 'Teleport')).toBe('-')
    expect(estimateDelivery(FRI, undefined)).toBe('-')
    expect(estimateDelivery(null, 'Ground')).toBe('-')
  })
})

test.describe('formatAddressLines', () => {
  test('labels Thai address parts and drops missing lines', () => {
    const lines = formatAddressLines({
      full_name: 'สมชาย ใจดี', address: '99/1 ถ.สุขุมวิท', city: 'วัฒนา', state: 'กรุงเทพมหานคร',
      zipcode: '10110', country: 'Thailand', phone: null, email: '',
    })
    expect(lines).toEqual([
      'สมชาย ใจดี', '99/1 ถ.สุขุมวิท', 'อำเภอ/เขต: วัฒนา', 'จังหวัด: กรุงเทพมหานคร', 'รหัสไปรษณีย์: 10110', 'ประเทศ: Thailand',
    ])
    expect(lines.join('\n')).not.toMatch(/null|undefined|โทร|อีเมล/)
  })
  test('includes phone and email when present', () => {
    expect(formatAddressLines({ phone: '0812345678', email: 'a@b.co' })).toEqual(['โทร: 0812345678', 'อีเมล: a@b.co'])
  })
})

test.describe('wrapText', () => {
  const measure = (s) => [...s].length // 1 unit per code point
  test('breaks Thai text on word boundaries within the width', () => {
    const lines = wrapText('สมุดโน้ตปกแข็งขนาดใหญ่พิเศษ', 10, measure)
    expect(lines.join('')).toBe('สมุดโน้ตปกแข็งขนาดใหญ่พิเศษ')
    for (const l of lines) expect(measure(l)).toBeLessThanOrEqual(10)
  })
  test('splits an over-long word without separating tone marks from their base', () => {
    const lines = wrapText('ก่ก่ก่ก่ก่', 3, measure)
    expect(lines.join('')).toBe('ก่ก่ก่ก่ก่')
    for (const l of lines) expect(l.startsWith('่')).toBe(false)
  })
  test('blank input gives no lines', () => {
    expect(wrapText(null, 10, measure)).toEqual([])
  })
})
