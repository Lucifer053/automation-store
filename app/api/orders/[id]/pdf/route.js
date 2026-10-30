import { NextResponse } from 'next/server'
import { orderAPI } from '../../../../../src/utils/api'
import { authenticateRequest } from '../../../middleware/auth'
import { buildOrderPdf } from '../../../../../src/lib/pdf/orderPdf'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/orders/[id]/pdf — order summary as a Thai PDF (owner only, same rules as GET /api/orders/[id])
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

  try {
    const pdf = await buildOrderPdf(result.data)
    return new NextResponse(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="order-${result.data.id}.pdf"`,
        'Content-Length': String(pdf.length),
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('Failed to generate order PDF', error)
    return NextResponse.json({ success: false, error: 'Could not generate PDF' }, { status: 500 })
  }
}
