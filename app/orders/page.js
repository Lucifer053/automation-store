'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../src/contexts/AuthContext'
import { downloadOrderPdf } from '../../src/utils/downloadPdf'

export default function OrdersPage() {
  const { token, loading } = useAuth()
  const router = useRouter()
  const [orders, setOrders] = useState(null)
  const [error, setError] = useState(null)
  const [pdfBusyId, setPdfBusyId] = useState(null)
  const [pdfError, setPdfError] = useState(false)

  useEffect(() => {
    if (loading) return
    if (!token) { router.replace('/login'); return }
    fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((j) => (j.success ? setOrders(j.data) : setError(j.error)))
  }, [loading, token, router])

  async function downloadPdf(orderId) {
    if (pdfBusyId !== null) return
    setPdfBusyId(orderId)
    setPdfError(false)
    try { await downloadOrderPdf(orderId, token) } catch { setPdfError(true) } finally { setPdfBusyId(null) }
  }

  if (error) return <div className="container"><div className="empty-state" data-qa="orders-error">{error}</div></div>
  if (!orders) return <div className="loading" data-qa="loading">Loading orders…</div>

  return (
    <div className="container">
      <div className="page-head"><h1 data-qa="orders-heading">My Orders</h1></div>

      {pdfError && <p className="alert-error" data-qa="pdf-error" role="alert">Could not generate PDF. Please try again.</p>}

      {orders.length === 0 ? (
        <div className="empty-state" data-qa="orders-empty">
          <h2>No orders yet 📦</h2>
          <p>When you place an order it will show up here.</p>
          <Link href="/products" className="btn btn-primary" style={{ maxWidth: 220, margin: '0 auto' }}>Start shopping</Link>
        </div>
      ) : (
        <table className="cart-table" data-qa="orders-table" style={{ marginBottom: 50 }}>
          <thead>
            <tr><th>Order</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} data-qa="order-row" data-order-id={o.id}>
                <td data-qa="order-id">#{o.id}</td>
                <td>{new Date(o.created_at).toLocaleDateString()}</td>
                <td>{(o.items || []).reduce((n, i) => n + i.quantity, 0)}</td>
                <td>Rs. {Number(o.total)}</td>
                <td><span className={`order-status ${o.status.toLowerCase()}`} data-qa="order-status">{o.status}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Link href={`/orders/${o.id}`} className="btn btn-ghost" data-qa="view-order" style={{ maxWidth: 110 }}>View</Link>
                    <button type="button" className="btn btn-ghost" data-qa="order-pdf" onClick={() => downloadPdf(o.id)} disabled={pdfBusyId !== null} style={{ maxWidth: 110 }}>
                      {pdfBusyId === o.id ? 'Generating…' : 'PDF'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
