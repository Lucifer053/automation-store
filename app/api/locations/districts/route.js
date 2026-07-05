import { NextResponse } from 'next/server'
import { locationAPI } from '../../../../src/utils/api'

// GET /api/locations/districts?province_id=1 — districts (อำเภอ) of a province
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const provinceId = parseInt(searchParams.get('province_id'))
    if (isNaN(provinceId)) {
      return NextResponse.json({ success: false, error: 'province_id is required' }, { status: 400 })
    }
    const result = await locationAPI.getDistricts(provinceId)
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }
    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    console.error('Get districts error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
