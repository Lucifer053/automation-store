'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCart } from '../../src/contexts/CartContext'
import { useAuth } from '../../src/contexts/AuthContext'

export default function CartPage() {
  const { items, updateQuantity, removeItem, total } = useCart()
  const { user } = useAuth()
  const router = useRouter()
  const [agree, setAgree] = useState(false)
  const [note, setNote] = useState(null)

  function checkout() {
    setNote(null)
    if (!agree) { setNote('Please agree to the terms of service to continue.'); return }
    if (!user) { router.push('/login'); return }   // must be logged in to place an order
    router.push('/checkout')
  }

  if (items.length === 0) {
    return (
      <div className="container">
        <div className="empty-state" data-qa="cart-empty">
          <h2>Your cart is empty 🛒</h2>
          <p>Add some products to get started.</p>
          <Link href="/products" className="btn btn-primary" style={{ maxWidth: 220, margin: '0 auto' }}>
            Browse products
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="page-head"><h1 data-qa="cart-heading">Shopping Cart</h1></div>
      <table className="cart-table" data-qa="cart-table">
        <thead>
          <tr><th>Item</th><th>Price</th><th>Quantity</th><th>Total</th><th></th></tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} data-qa="cart-row" data-product-id={i.id}>
              <td>
                <div className="cart-prod">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={i.image_url} alt={i.name} />
                  <span data-qa="cart-name">{i.name}</span>
                </div>
              </td>
              <td data-qa="cart-price">Rs. {i.price}</td>
              <td>
                <input
                  type="number" min="1" value={i.quantity} style={{ width: 70 }}
                  onChange={(e) => updateQuantity(i.id, parseInt(e.target.value) || 1)}
                  data-qa="cart-quantity"
                />
              </td>
              <td data-qa="cart-subtotal">Rs. {i.price * i.quantity}</td>
              <td>
                <button className="btn btn-danger" data-qa="cart-delete" onClick={() => removeItem(i.id)}>✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="cart-summary">
        <div className="box">
          <p style={{ fontSize: 20 }}>Total: <strong data-qa="cart-total">Rs. {total}</strong></p>
          <label className="radio-opt" style={{ margin: '8px 0 14px' }}>
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} data-qa="agree-terms" />
            I agree with the terms of service
          </label>
          {note && <div className="alert-error" data-qa="cart-note">{note}</div>}
          {!user && <p className="muted" style={{ fontSize: 13 }}>You’ll be asked to log in before placing the order.</p>}
          <button className="btn btn-primary btn-block" data-qa="checkout" onClick={checkout}>
            Proceed To Checkout
          </button>
        </div>
      </div>
    </div>
  )
}
