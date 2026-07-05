'use client'

import { createContext, useContext, useEffect, useState } from 'react'

const CartContext = createContext(null)

// Client-side cart (localStorage) so guests can shop, mirroring automationexercise.
// Each item: { id, name, price, image_url, quantity }
export function CartProvider({ children }) {
  const [items, setItems] = useState([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('as_cart')
      if (raw) setItems(JSON.parse(raw))
    } catch {}
    setReady(true)
  }, [])

  useEffect(() => {
    if (ready) localStorage.setItem('as_cart', JSON.stringify(items))
  }, [items, ready])

  function addItem(product, quantity = 1) {
    setItems((prev) => {
      const found = prev.find((i) => i.id === product.id)
      if (found) {
        return prev.map((i) => (i.id === product.id ? { ...i, quantity: i.quantity + quantity } : i))
      }
      return [...prev, {
        id: product.id, name: product.name, price: Number(product.price),
        image_url: product.image_url, quantity,
      }]
    })
  }

  function updateQuantity(id, quantity) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i)))
  }

  function removeItem(id) {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  function clear() {
    setItems([])
  }

  const count = items.reduce((n, i) => n + i.quantity, 0)
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0)

  return (
    <CartContext.Provider value={{ items, addItem, updateQuantity, removeItem, clear, count, total }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
