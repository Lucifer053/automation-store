import { NextResponse } from 'next/server'
import { productAPI } from '../../../src/utils/api'

// GET /api/products              — all products
// GET /api/products?search=dress — search by name
// GET /api/products?category=Women&subcategory=Tops
// GET /api/products?brand=Polo
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const result = await productAPI.getAllProducts({
      search: searchParams.get('search') || undefined,
      category: searchParams.get('category') || undefined,
      subcategory: searchParams.get('subcategory') || undefined,
      brand: searchParams.get('brand') || undefined,
    })
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }
    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    console.error('Get products error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
