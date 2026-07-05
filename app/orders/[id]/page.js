'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { useAuth } from '../../../src/contexts/AuthContext'

export default function OrderDetailPage() {
  const { id } = useParams()
  const search = useSearchParams()
  const placed = search.get('placed') === '1'
  const { token, loading } = useAuth()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (loading) return
    if (!token) { setError('Please log in to view this order'); return }
    fetch(`/api/orders/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((j) => (j.success ? setOrder(j.data) : setError(j.error)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, token, id])

  function printInvoice() { window.print() }

  if (error) return <div className="container"><div className="empty-state" data-qa="order-error">{error}</div></div>
  if (!order) return <div className="loading" data-qa="loading">Loading order…</div>

  return (
    <div className="container">
      {placed && (
        <div className="card center order-success" data-qa="order-success" style={{ margin: '30px auto', maxWidth: 640 }}>
          <div className="success-check">✓</div>
          <h2>Thank you! Your order has been placed.</h2>
          <p className="muted">Order <strong data-qa="order-number">#{order.id}</strong> — status: {order.status}</p>
        </div>
      )}

      <div className="card" style={{ maxWidth: 820, margin: '20px auto' }} data-qa="order-detail">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Order #{order.id}</h2>
          <button className="btn btn-ghost" data-qa="download-invoice" onClick={printInvoice} style={{ maxWidth: 180 }}>
            Download / Print Invoice
          </button>
        </div>
        <p className="muted">Placed on {new Date(order.created_at).toLocaleString()} · Status: <strong>{order.status}</strong></p>

        <div className="confirm-cols" style={{ marginTop: 12 }}>
          <div>
            <h3>Shipping Address</h3>
            <p className="muted">
              {order.full_name}<br />{order.address}<br />
              {order.city}, {order.state} {order.zipcode}<br />{order.country}<br />
              {order.phone && <>Phone: {order.phone}<br /></>}
              {order.email}
            </p>
          </div>
          <div>
            <h3>Shipping &amp; Payment</h3>
            <p className="muted">
              Shipping: <strong>{order.shipping_method}</strong><br />
              Payment: <strong>{order.payment_method}</strong>
              {order.card_last4 && <> (•••• {order.card_last4})</>}
            </p>
          </div>
        </div>

        <table className="cart-table" style={{ marginTop: 16 }}>
          <thead><tr><th>Item</th><th>Price</th><th>Qty</th><th>Total</th></tr></thead>
          <tbody>
            {(order.items || []).map((i) => (
              <tr key={i.id} data-qa="order-item">
                <td>{i.name}</td><td>Rs. {Number(i.price)}</td><td>{i.quantity}</td><td>Rs. {Number(i.price) * i.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="cart-summary" style={{ marginTop: 16 }}>
          <div className="box">
            <div className="sum-row"><span>Sub-Total</span><span>Rs. {Number(order.subtotal)}</span></div>
            <div className="sum-row"><span>Shipping</span><span>Rs. {Number(order.shipping_cost)}</span></div>
            <div className="sum-row"><span>Tax</span><span>Rs. {Number(order.tax)}</span></div>
            <div className="sum-row total"><span>Total</span><span data-qa="order-total">Rs. {Number(order.total)}</span></div>
          </div>
        </div>

        <p className="center" style={{ marginTop: 20 }}>
          <Link href="/products" className="btn btn-primary" style={{ maxWidth: 220, display: 'inline-block' }}>Continue Shopping</Link>
        </p>
      </div>
    </div>
  )
}
