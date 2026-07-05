import { NextResponse } from 'next/server'
import { cartAPI } from '../../../src/utils/api'
import { authenticateRequest } from '../middleware/auth'

// Persistent per-user cart. All methods require Authorization: Bearer <token>.
// (Guests use the client-side cart; this API syncs a logged-in user's cart.)

async function requireUser(request) {
  const auth = await authenticateRequest(request)
  if (!auth.success) return { error: NextResponse.json({ success: false, error: auth.error }, { status: 401 }) }
  return { user: auth.user }
}

// GET /api/cart — items for the logged-in user
export async function GET(request) {
  const { user, error } = await requireUser(request)
  if (error) return error
  const result = await cartAPI.getCart(user.id)
  if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 500 })
  return NextResponse.json({ success: true, data: result.data })
}

// POST /api/cart  { product_id, quantity } — add / increment
export async function POST(request) {
  const { user, error } = await requireUser(request)
  if (error) return error
  const { product_id, quantity } = await request.json()
  if (!product_id) return NextResponse.json({ success: false, error: 'product_id is required' }, { status: 400 })
  const result = await cartAPI.addItem(user.id, product_id, parseInt(quantity) || 1)
  if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 500 })
  return NextResponse.json({ success: true, data: result.data }, { status: 201 })
}

// PUT /api/cart  { product_id, quantity } — set quantity
export async function PUT(request) {
  const { user, error } = await requireUser(request)
  if (error) return error
  const { product_id, quantity } = await request.json()
  if (!product_id || quantity == null) {
    return NextResponse.json({ success: false, error: 'product_id and quantity are required' }, { status: 400 })
  }
  const result = await cartAPI.updateItem(user.id, product_id, parseInt(quantity))
  if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 500 })
  return NextResponse.json({ success: true, data: result.data })
}

// DELETE /api/cart?product_id=123 — remove an item
export async function DELETE(request) {
  const { user, error } = await requireUser(request)
  if (error) return error
  const { searchParams } = new URL(request.url)
  const productId = parseInt(searchParams.get('product_id'))
  if (isNaN(productId)) return NextResponse.json({ success: false, error: 'product_id is required' }, { status: 400 })
  const result = await cartAPI.removeItem(user.id, productId)
  if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 500 })
  return NextResponse.json({ success: true, message: 'Item removed' })
}
