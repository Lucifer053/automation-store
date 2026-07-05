'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../src/contexts/AuthContext'
import { useCart } from '../../src/contexts/CartContext'

const STEPS = ['Address', 'Shipping method', 'Payment method', 'Payment information', 'Confirm order']
const SHIPPING_OPTIONS = [
  { key: 'Ground', label: 'Ground', cost: 0, desc: 'Shipping by land transport (3–5 days)' },
  { key: 'Next Day Air', label: 'Next Day Air', cost: 60, desc: 'Next business day delivery' },
  { key: '2nd Day Air', label: '2nd Day Air', cost: 40, desc: 'Delivery within 2 business days' },
]
const PAYMENT_OPTIONS = [
  { key: 'Check / Money Order', label: 'Check / Money Order', desc: 'Pay by cheque or money order' },
  { key: 'Credit Card', label: 'Credit Card', desc: 'Pay by credit / debit card' },
]

export default function CheckoutPage() {
  const { user, token, loading } = useAuth()
  const { items, total: subtotal, clear } = useCart()
  const router = useRouter()

  const [step, setStep] = useState(0)
  const [addr, setAddr] = useState({
    full_name: '', email: '', phone: '', address: '', city: '', state: '', zipcode: '', country: 'Thailand',
  })
  const [shippingMethod, setShippingMethod] = useState('Ground')
  const [paymentMethod, setPaymentMethod] = useState('Check / Money Order')
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvv: '' })
  const [error, setError] = useState(null)
  const [placing, setPlacing] = useState(false)

  // guards + prefill
  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/login'); return }
    if (items.length === 0) { router.replace('/cart'); return }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((j) => {
        if (!j.success) return
        const u = j.data
        setAddr((a) => ({
          ...a,
          full_name: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.name || '',
          email: u.email || '',
          phone: u.mobile_number || '',
          address: u.address1 || '',
          city: u.city || '',
          state: u.state || '',
          zipcode: u.zipcode || '',
          country: u.country || 'Thailand',
        }))
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user])

  const shippingCost = SHIPPING_OPTIONS.find((s) => s.key === shippingMethod)?.cost || 0
  const total = subtotal + shippingCost

  function next() {
    setError(null)
    if (step === 0) {
      const { full_name, address, city, state, zipcode } = addr
      if (!full_name || !address || !city || !state || !zipcode) {
        setError('Please fill in all required address fields'); return
      }
    }
    if (step === 3 && paymentMethod === 'Credit Card') {
      const num = card.number.replace(/\s+/g, '')
      if (!/^\d{16}$/.test(num)) { setError('Card number must be 16 digits'); return }
      if (!card.name.trim()) { setError('Please enter the cardholder name'); return }
      if (!/^\d{2}\/\d{2}$/.test(card.expiry)) { setError('Expiry must be MM/YY'); return }
      if (!/^\d{3,4}$/.test(card.cvv)) { setError('CVV must be 3–4 digits'); return }
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }
  function back() { setError(null); setStep((s) => Math.max(s - 1, 0)) }

  async function placeOrder() {
    setError(null)
    setPlacing(true)
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        items: items.map((i) => ({ product_id: i.id, quantity: i.quantity })),
        address: addr,
        shipping_method: shippingMethod,
        payment_method: paymentMethod,
        card: paymentMethod === 'Credit Card' ? { number: card.number } : undefined,
      }),
    })
    const json = await res.json()
    setPlacing(false)
    if (json.success) { clear(); router.push(`/orders/${json.data.id}?placed=1`) }
    else setError(json.error || 'Failed to place order')
  }

  if (loading || !user || items.length === 0) {
    return <div className="loading" data-qa="loading">Loading checkout…</div>
  }

  return (
    <div className="container">
      <div className="page-head center"><h1 data-qa="checkout-heading">Checkout</h1></div>

      {/* stepper */}
      <div className="stepper" data-qa="stepper">
        {STEPS.map((s, i) => (
          <div key={s} className={`step-bar ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
               onClick={() => i < step && setStep(i)} data-qa={`step-${i + 1}`}>
            <span className="step-num">{i + 1}</span> {s}
          </div>
        ))}
      </div>

      <div className="checkout-grid">
        <div className="card checkout-panel">
          {error && <div className="alert-error" data-qa="checkout-error">{error}</div>}

          {/* Step 1: Address */}
          {step === 0 && (
            <div data-qa="step-address">
              <h2>Billing &amp; Shipping Address</h2>
              <div className="form-field">
                <label>Full name *</label>
                <input value={addr.full_name} onChange={(e) => setAddr({ ...addr, full_name: e.target.value })} data-qa="addr-name" />
              </div>
              <div className="row-2">
                <div className="form-field">
                  <label>Email</label>
                  <input type="email" value={addr.email} onChange={(e) => setAddr({ ...addr, email: e.target.value })} data-qa="addr-email" />
                </div>
                <div className="form-field">
                  <label>Phone</label>
                  <input value={addr.phone} onChange={(e) => setAddr({ ...addr, phone: e.target.value })} data-qa="addr-phone" />
                </div>
              </div>
              <div className="form-field">
                <label>Address *</label>
                <input value={addr.address} onChange={(e) => setAddr({ ...addr, address: e.target.value })} data-qa="addr-address" />
              </div>
              <div className="row-3">
                <div className="form-field">
                  <label>Province *</label>
                  <input value={addr.state} onChange={(e) => setAddr({ ...addr, state: e.target.value })} data-qa="addr-state" />
                </div>
                <div className="form-field">
                  <label>District *</label>
                  <input value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} data-qa="addr-city" />
                </div>
                <div className="form-field">
                  <label>Zipcode *</label>
                  <input value={addr.zipcode} onChange={(e) => setAddr({ ...addr, zipcode: e.target.value })} data-qa="addr-zipcode" />
                </div>
              </div>
              <div className="form-field">
                <label>Country</label>
                <input value={addr.country} readOnly data-qa="addr-country" />
              </div>
            </div>
          )}

          {/* Step 2: Shipping method */}
          {step === 1 && (
            <div data-qa="step-shipping">
              <h2>Shipping method</h2>
              {SHIPPING_OPTIONS.map((s) => (
                <label key={s.key} className={`option-row ${shippingMethod === s.key ? 'sel' : ''}`} data-qa={`shipping-${s.key.replace(/\s+/g, '-').toLowerCase()}`}>
                  <input type="radio" name="shipping" checked={shippingMethod === s.key} onChange={() => setShippingMethod(s.key)} />
                  <span className="opt-main"><strong>{s.label}</strong> <span className="muted">— {s.desc}</span></span>
                  <span className="opt-price">Rs. {s.cost}</span>
                </label>
              ))}
            </div>
          )}

          {/* Step 3: Payment method */}
          {step === 2 && (
            <div data-qa="step-payment-method">
              <h2>Payment method</h2>
              {PAYMENT_OPTIONS.map((p) => (
                <label key={p.key} className={`option-row ${paymentMethod === p.key ? 'sel' : ''}`}
                       data-qa={`payment-${p.key === 'Credit Card' ? 'card' : 'cod'}`}>
                  <input type="radio" name="payment" checked={paymentMethod === p.key} onChange={() => setPaymentMethod(p.key)} />
                  <span className="opt-main"><strong>{p.label}</strong> <span className="muted">— {p.desc}</span></span>
                </label>
              ))}
            </div>
          )}

          {/* Step 4: Payment info */}
          {step === 3 && (
            <div data-qa="step-payment-info">
              <h2>Payment information</h2>
              {paymentMethod === 'Credit Card' ? (
                <>
                  <div className="form-field">
                    <label>Card number *</label>
                    <input value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })}
                           placeholder="4111 1111 1111 1111" inputMode="numeric" maxLength={19} data-qa="card-number" />
                  </div>
                  <div className="form-field">
                    <label>Name on card *</label>
                    <input value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} data-qa="card-name" />
                  </div>
                  <div className="row-2">
                    <div className="form-field">
                      <label>Expiry (MM/YY) *</label>
                      <input value={card.expiry} onChange={(e) => setCard({ ...card, expiry: e.target.value })}
                             placeholder="12/28" maxLength={5} data-qa="card-expiry" />
                    </div>
                    <div className="form-field">
                      <label>CVV *</label>
                      <input value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value })}
                             inputMode="numeric" maxLength={4} data-qa="card-cvv" />
                    </div>
                  </div>
                  <p className="muted" style={{ fontSize: 13 }}>Demo only — no real charge is made. Try 4111 1111 1111 1111.</p>
                </>
              ) : (
                <div className="muted" data-qa="cod-info">
                  <p>Mail your Personal or Business Check / money order to:</p>
                  <p><strong>AutomationStore</strong><br />123 Demo Street<br />Bangkok, 10110, Thailand</p>
                  <p>Your order will be marked <em>Pending</em> until payment is received.</p>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Confirm */}
          {step === 4 && (
            <div data-qa="step-confirm">
              <h2>Confirm order</h2>
              <div className="confirm-cols">
                <div>
                  <h3>Shipping Address</h3>
                  <p className="muted" data-qa="confirm-address">
                    {addr.full_name}<br />{addr.address}<br />
                    {addr.city}, {addr.state} {addr.zipcode}<br />{addr.country}<br />
                    {addr.phone && <>Phone: {addr.phone}<br /></>}
                    {addr.email && <>Email: {addr.email}</>}
                  </p>
                </div>
                <div>
                  <h3>Shipping &amp; Payment</h3>
                  <p className="muted">
                    Shipping: <strong data-qa="confirm-shipping">{shippingMethod}</strong><br />
                    Payment: <strong data-qa="confirm-payment">{paymentMethod}</strong>
                    {paymentMethod === 'Credit Card' && card.number && <> (•••• {card.number.replace(/\s+/g, '').slice(-4)})</>}
                  </p>
                </div>
              </div>
              <table className="cart-table" style={{ marginTop: 16 }}>
                <thead><tr><th>Item</th><th>Price</th><th>Qty</th><th>Total</th></tr></thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.id} data-qa="confirm-item">
                      <td>{i.name}</td><td>Rs. {i.price}</td><td>{i.quantity}</td><td>Rs. {i.price * i.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* nav */}
          <div className="checkout-nav">
            {step > 0 && <button className="btn btn-ghost" data-qa="checkout-back" onClick={back} style={{ maxWidth: 120 }}>Back</button>}
            {step < STEPS.length - 1 ? (
              <button className="btn btn-primary" data-qa="checkout-continue" onClick={next} style={{ maxWidth: 160, marginLeft: 'auto' }}>Continue</button>
            ) : (
              <button className="btn btn-primary" data-qa="place-order" onClick={placeOrder} disabled={placing}
                      style={{ maxWidth: 200, marginLeft: 'auto' }}>
                {placing ? 'Placing…' : 'Place Order'}
              </button>
            )}
          </div>
        </div>

        {/* order summary */}
        <div className="card order-summary" data-qa="order-summary">
          <h3>Order Summary</h3>
          {items.map((i) => (
            <div key={i.id} className="sum-row"><span>{i.name} × {i.quantity}</span><span>Rs. {i.price * i.quantity}</span></div>
          ))}
          <hr />
          <div className="sum-row"><span>Sub-Total</span><span data-qa="summary-subtotal">Rs. {subtotal}</span></div>
          <div className="sum-row"><span>Shipping ({shippingMethod})</span><span data-qa="summary-shipping">Rs. {shippingCost}</span></div>
          <div className="sum-row"><span>Tax</span><span>Rs. 0</span></div>
          <hr />
          <div className="sum-row total"><span>Total</span><span data-qa="summary-total">Rs. {total}</span></div>
        </div>
      </div>
    </div>
  )
}
