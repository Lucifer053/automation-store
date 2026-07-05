import { NextResponse } from 'next/server'
import { productAPI } from '../../../src/utils/api'

// GET /api/brands — brand list with product counts
export async function GET() {
  try {
    const result = await productAPI.getBrands()
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }
    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    console.error('Get brands error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
