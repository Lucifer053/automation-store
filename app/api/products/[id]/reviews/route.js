import { NextResponse } from 'next/server'
import { reviewAPI } from '../../../../../src/utils/api'

// GET /api/products/[id]/reviews — list reviews for a product
export async function GET(request, { params }) {
  try {
    const productId = parseInt(params.id)
    if (isNaN(productId)) {
      return NextResponse.json({ success: false, error: 'Invalid product ID' }, { status: 400 })
    }
    const result = await reviewAPI.getReviewsByProduct(productId)
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }
    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    console.error('Get reviews error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/products/[id]/reviews — add a review (public, like automationexercise)
export async function POST(request, { params }) {
  try {
    const productId = parseInt(params.id)
    if (isNaN(productId)) {
      return NextResponse.json({ success: false, error: 'Invalid product ID' }, { status: 400 })
    }
    const { name, email, review } = await request.json()
    if (!name || !email || !review) {
      return NextResponse.json({ success: false, error: 'Name, email and review are required' }, { status: 400 })
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, error: 'Please enter a valid email address' }, { status: 400 })
    }
    const result = await reviewAPI.createReview({ product_id: productId, name, email, review })
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }
    return NextResponse.json(
      { success: true, message: 'Thank you for your review.', data: result.data },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create review error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
