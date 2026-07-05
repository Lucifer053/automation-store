import { NextResponse } from 'next/server'
import { productAPI } from '../../../src/utils/api'

// GET /api/categories — categories with their subcategories
export async function GET() {
  try {
    const result = await productAPI.getCategories()
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }
    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    console.error('Get categories error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
