import { NextResponse } from 'next/server'
import { locationAPI } from '../../../../src/utils/api'

// GET /api/locations/provinces — all Thai provinces (จังหวัด)
export async function GET() {
  try {
    const result = await locationAPI.getProvinces()
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }
    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    console.error('Get provinces error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
