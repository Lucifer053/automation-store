'use client'

import { useEffect, useState } from 'react'
import ProductCard from '../../src/components/ProductCard'
import CategorySidebar from '../../src/components/CategorySidebar'

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [term, setTerm] = useState('')
  const [query, setQuery] = useState({})      // {search} or {category/subcategory} or {brand}
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (query.search) qs.set('search', query.search)
    if (query.category) qs.set('category', query.category)
    if (query.subcategory) qs.set('subcategory', query.subcategory)
    if (query.brand) qs.set('brand', query.brand)
    fetch(`/api/products?${qs}`)
      .then((r) => r.json())
      .then((j) => { if (j.success) setProducts(j.data); setLoading(false) })
  }, [query])

  function submitSearch(e) {
    e.preventDefault()
    setSearched(true)
    setQuery({ search: term })
  }

  const heading = searched
    ? 'Searched Products'
    : query.brand
    ? `Brand — ${query.brand}`
    : query.subcategory
    ? `${query.category} — ${query.subcategory} Products`
    : 'All Products'

  return (
    <div className="container">
      <div className="page-head center"><h1 data-qa="products-heading">Products</h1></div>

      <form className="search-bar" onSubmit={submitSearch} data-qa="search-form">
        <input
          type="text"
          placeholder="Search Product"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          data-qa="search-product"
        />
        <button type="submit" data-qa="submit-search">Search</button>
      </form>

      <div className="shop-layout">
        <CategorySidebar onSelect={(f) => { setSearched(false); setQuery(f) }} active={query} />
        <div>
          <h2 className="section-title" data-qa="list-heading"><span>{heading}</span></h2>
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
  )
}
