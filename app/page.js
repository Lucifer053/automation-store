'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ProductCard from '../src/components/ProductCard'
import CategorySidebar from '../src/components/CategorySidebar'

export default function Home() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({})

  useEffect(() => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (filter.category) qs.set('category', filter.category)
    if (filter.subcategory) qs.set('subcategory', filter.subcategory)
    if (filter.brand) qs.set('brand', filter.brand)
    fetch(`/api/products?${qs}`)
      .then((r) => r.json())
      .then((j) => { if (j.success) setProducts(j.data); setLoading(false) })
  }, [filter])

  const heading = filter.brand
    ? `Brand — ${filter.brand}`
    : filter.subcategory
    ? `${filter.category} — ${filter.subcategory}`
    : 'Features Items'

  return (
    <>
      <section className="hero" data-qa="hero">
        <div className="container">
          <h1>AutomationStore</h1>
          <p>A demo online store — browse products, add to cart, sign up, and write reviews.
             Built for practicing end-to-end test automation.</p>
          <Link href="/products" className="btn btn-primary" data-qa="hero-shop">Shop all products</Link>
        </div>
      </section>

      <div className="container">
        <div className="shop-layout">
          <CategorySidebar onSelect={setFilter} active={filter} />

          <div>
            <h2 className="section-title" data-qa="featured-title"><span>{heading}</span></h2>
            {(filter.category || filter.brand) && (
              <p className="center" style={{ marginTop: -12, marginBottom: 18 }}>
                <button className="btn btn-ghost" data-qa="clear-filter" onClick={() => setFilter({})}
                        style={{ maxWidth: 180 }}>
                  ← All products
                </button>
              </p>
            )}
            {loading ? (
              <div className="loading" data-qa="loading">Loading products…</div>
            ) : products.length === 0 ? (
              <div className="empty-state" data-qa="no-products">No products found.</div>
            ) : (
              <div className="products-grid" data-qa="products">
                {products.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
