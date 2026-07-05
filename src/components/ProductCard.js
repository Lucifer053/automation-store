'use client'

import Link from 'next/link'
import { useCart } from '../contexts/CartContext'

export default function ProductCard({ product }) {
  const { addItem } = useCart()

  return (
    <div className="product-card" data-qa="product-item" data-product-id={product.id}>
      <div className="product-media">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.image_url} alt={product.name} loading="lazy" />
        <div className="product-overlay">
          <button
            className="btn btn-add"
            data-qa="add-to-cart"
            onClick={() => addItem(product, 1)}
          >
            Add to cart
          </button>
        </div>
      </div>
      <div className="product-body">
        <p className="product-price" data-qa="product-price">Rs. {Number(product.price)}</p>
        <p className="product-name" data-qa="product-name">{product.name}</p>
        <p className="product-meta">{product.brand} · {product.category}</p>
        <div className="product-actions">
          <Link href={`/products/${product.id}`} className="btn btn-ghost" data-qa="view-product">
            View Product
          </Link>
          <button className="btn btn-add-outline" data-qa="add-to-cart-2" onClick={() => addItem(product, 1)}>
            Add to cart
          </button>
        </div>
      </div>
    </div>
  )
}
