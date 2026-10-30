// Sanity-check the QA reference helpers against the worked examples in spec §4.2/§4.4 (no network).
const { test, expect } = require('@playwright/test')
const { baht, expectedDelivery, deliveryMatches, thaiDateTime, dmy } = require('./helpers/format')

test.describe('reference helpers match the spec examples', () => {
  // Friday 30 Oct 2026 14:05 Bangkok = 07:05Z
  const fri = '2026-10-30T07:05:00Z'

  test('§4.4 Friday table', () => {
    const f = (m) => { const e = expectedDelivery(fri, m); return e.start === e.end || (e.start.d === e.end.d) ? dmy(e.start) : `${e.start.d}–${dmy(e.end)}` }
    expect(f('Next Day Air')).toBe('2 พ.ย. 2569')
    expect(f('2nd Day Air')).toBe('3 พ.ย. 2569')
    expect(f('Ground')).toBe('4–6 พ.ย. 2569')
    expect(expectedDelivery(fri, 'Express')).toBeNull()
  })

  test('§4.3 Thai date-time, Bangkok zone and BE year', () => {
    expect(thaiDateTime(fri)).toBe('30 ต.ค. 2569 14:05')
    expect(thaiDateTime('2026-10-30T18:30:00Z')).toBe('31 ต.ค. 2569 01:30') // crosses midnight in Bangkok
  })

  test('§4.2 money', () => {
    expect(baht(1500)).toBe('฿1,500')
    expect(baht(99.5)).toBe('฿99.50')
    expect(baht(0)).toBe('฿0')
    expect(baht('1234567')).toBe('฿1,234,567')
  })

  test('deliveryMatches tolerates whitespace/dash variants', () => {
    const e = expectedDelivery(fri, 'Ground')
    expect(deliveryMatches('วันที่คาดว่าจะได้รับ: 4 - 6 พ.ย. 2569', e)).toBe(true)
    expect(deliveryMatches('วันที่คาดว่าจะได้รับ: 4–6 พ.ย. 2569', e)).toBe(true)
    expect(deliveryMatches('วันที่คาดว่าจะได้รับ: 3–5 พ.ย. 2569', e)).toBe(false)
  })
})
