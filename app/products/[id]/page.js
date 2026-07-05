'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useCart } from '../../../src/contexts/CartContext'

export default function ProductDetail() {
  const { id } = useParams()
  const { addItem } = useCart()
  const [product, setProduct] = useState(null)
  const [reviews, setReviews] = useState([])
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', review: '' })
  const [reviewMsg, setReviewMsg] = useState(null)

  useEffect(() => {
    fetch(`/api/products/${id}`).then((r) => r.json()).then((j) => j.success && setProduct(j.data))
    loadReviews()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function loadReviews() {
    fetch(`/api/products/${id}/reviews`).then((r) => r.json()).then((j) => j.success && setReviews(j.data))
  }

  async function submitReview(e) {
    e.preventDefault()
    setReviewMsg(null)
    const res = await fetch(`/api/products/${id}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    setReviewMsg({ ok: json.success, text: json.message || json.error })
    if (json.success) { setForm({ name: '', email: '', review: '' }); loadReviews() }
  }

  if (!product) return <div className="loading" data-qa="loading">Loading…</div>

  return (
    <div className="container">
      <div className="detail-wrap">
        <div className="detail-media" data-qa="product-image">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.image_url} alt={product.name} />
        </div>
        <div className="detail-info">
          <h1 data-qa="detail-name">{product.name}</h1>
          <p className="detail-meta">Category: {product.category} · {product.subcategory}</p>
          <p className="detail-meta">Brand: {product.brand}</p>
          <p className="detail-meta">Availability: {product.availability} · Condition: {product.condition}</p>
          <p className="detail-price" data-qa="detail-price">Rs. {Number(product.price)}</p>
          <p className="muted">{product.description}</p>

          <div className="qty-row">
            <label htmlFor="quantity">Quantity</label>
            <input
              id="quantity" type="number" min="1" value={qty}
              onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
              data-qa="quantity"
            />
            <button
              className="btn btn-add"
              data-qa="add-to-cart"
              onClick={() => { addItem(product, qty); setAdded(true) }}
            >
              Add to cart
            </button>
          </div>
          {added && <div className="alert-success" data-qa="added-msg">Added to cart.</div>}
        </div>
      </div>

      <div className="reviews">
        <h2 className="section-title"><span>Reviews ({reviews.length})</span></h2>

        <div data-qa="review-list">
          {reviews.length === 0 && <p className="muted center">No reviews yet. Be the first!</p>}
          {reviews.map((r) => (
            <div className="review-item" key={r.id} data-qa="review-item">
              <p className="who">{r.name}</p>
              <p className="muted" style={{ margin: 0 }}>{r.review}</p>
            </div>
          ))}
        </div>

        <h3 style={{ marginTop: 28 }}>Write Your Review</h3>
        <form className="review-form" onSubmit={submitReview} data-qa="review-form">
          <div className="form-field">
            <input placeholder="Your Name" value={form.name}
                   onChange={(e) => setForm({ ...form, name: e.target.value })} data-qa="review-name" required />
          </div>
          <div className="form-field">
            <input type="email" placeholder="Email Address" value={form.email}
                   onChange={(e) => setForm({ ...form, email: e.target.value })} data-qa="review-email" required />
          </div>
          <div className="form-field">
            <textarea rows="4" placeholder="Add Review Here!" value={form.review}
                      onChange={(e) => setForm({ ...form, review: e.target.value })} data-qa="review-text" required />
          </div>
          <button type="submit" className="btn btn-primary" data-qa="review-submit">Submit</button>
          {reviewMsg && (
            <div className={reviewMsg.ok ? 'alert-success' : 'alert-error'} data-qa="review-result">
              {reviewMsg.text}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
