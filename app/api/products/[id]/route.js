import { NextResponse } from 'next/server'
import { productAPI } from '../../../../src/utils/api'

// GET /api/products/[id] — product detail
export async function GET(request, { params }) {
  try {
    const productId = parseInt(params.id)
    if (isNaN(productId)) {
      return NextResponse.json({ success: false, error: 'Invalid product ID' }, { status: 400 })
    }
    const result = await productAPI.getProductById(productId)
    if (!result.success) {
      const status = result.notFound ? 404 : 500
      return NextResponse.json(
        { success: false, error: result.notFound ? `Product ${productId} not found` : result.error },
        { status }
      )
    }
    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    console.error('Get product error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
