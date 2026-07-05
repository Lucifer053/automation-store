import { NextResponse } from 'next/server'
import { orderAPI } from '../../../../src/utils/api'
import { authenticateRequest } from '../../middleware/auth'

// GET /api/orders/[id] — order detail (owner only)
export async function GET(request, { params }) {
  const auth = await authenticateRequest(request)
  if (!auth.success) return NextResponse.json({ success: false, error: auth.error }, { status: 401 })

  const orderId = parseInt(params.id)
  if (isNaN(orderId)) return NextResponse.json({ success: false, error: 'Invalid order ID' }, { status: 400 })

  const result = await orderAPI.getOrderById(orderId)
  if (!result.success) {
    const status = result.notFound ? 404 : 500
    return NextResponse.json({ success: false, error: result.notFound ? 'Order not found' : result.error }, { status })
  }
  if (result.data.user_id !== auth.user.id) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }
  return NextResponse.json({ success: true, data: result.data })
}
