import { NextResponse } from 'next/server'
import { orderAPI, productAPI } from '../../../src/utils/api'
import { authenticateRequest } from '../middleware/auth'

// shipping cost per method (Rs.)
const SHIPPING = { 'Ground': 0, 'Next Day Air': 60, '2nd Day Air': 40 }

async function requireUser(request) {
  const auth = await authenticateRequest(request)
  if (!auth.success) return { error: NextResponse.json({ success: false, error: auth.error }, { status: 401 }) }
  return { user: auth.user }
}

// GET /api/orders — the logged-in user's orders
export async function GET(request) {
  const { user, error } = await requireUser(request)
  if (error) return error
  const result = await orderAPI.getUserOrders(user.id)
  if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 500 })
  return NextResponse.json({ success: true, data: result.data })
}

// POST /api/orders — place an order
// body: { items:[{product_id, quantity}], address:{full_name,email,phone,address,city,state,zipcode,country},
//         shipping_method, payment_method, card:{number} }
export async function POST(request) {
  const { user, error } = await requireUser(request)
  if (error) return error
  try {
    const body = await request.json()
    const { items, address = {}, shipping_method, payment_method, card } = body

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Cart is empty' }, { status: 400 })
    }
    if (!address.full_name || !address.address || !address.city || !address.state || !address.zipcode) {
      return NextResponse.json({ success: false, error: 'Incomplete shipping address' }, { status: 400 })
    }
    if (!(shipping_method in SHIPPING)) {
      return NextResponse.json({ success: false, error: 'Invalid shipping method' }, { status: 400 })
    }
    if (!['Check / Money Order', 'Credit Card'].includes(payment_method)) {
      return NextResponse.json({ success: false, error: 'Invalid payment method' }, { status: 400 })
    }

    // validate card if paying by credit card (demo — no real gateway)
    let card_last4 = null
    if (payment_method === 'Credit Card') {
      const num = String(card?.number || '').replace(/\s+/g, '')
      if (!/^\d{16}$/.test(num)) {
        return NextResponse.json({ success: false, error: 'Invalid card number (16 digits)' }, { status: 400 })
      }
      card_last4 = num.slice(-4)
    }

    // price the cart from the DB (never trust client prices)
    const priced = []
    for (const it of items) {
      const p = await productAPI.getProductById(it.product_id)
      if (!p.success) return NextResponse.json({ success: false, error: `Product ${it.product_id} not found` }, { status: 400 })
      const qty = Math.max(1, parseInt(it.quantity) || 1)
      priced.push({ product_id: p.data.id, name: p.data.name, price: Number(p.data.price), quantity: qty })
    }

    const subtotal = priced.reduce((s, i) => s + i.price * i.quantity, 0)
    const shipping_cost = SHIPPING[shipping_method]
    const tax = 0
    const total = subtotal + shipping_cost + tax

    const order = {
      user_id: user.id,
      status: payment_method === 'Credit Card' ? 'Paid' : 'Pending',
      full_name: address.full_name, email: address.email || user.email, phone: address.phone || null,
      address: address.address, city: address.city, state: address.state,
      zipcode: address.zipcode, country: address.country || 'Thailand',
      shipping_method, payment_method, card_last4,
      subtotal, shipping_cost, tax, total,
    }

    const result = await orderAPI.createOrder(order, priced)
    if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    return NextResponse.json({ success: true, message: 'Your order has been placed!', data: result.data }, { status: 201 })
  } catch (e) {
    console.error('Create order error:', e)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
