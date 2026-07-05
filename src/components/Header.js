'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'

export default function Header() {
  const { user, logout } = useAuth()
  const { count } = useCart()
  const router = useRouter()

  return (
    <header className="site-header" data-qa="header">
      <div className="container header-inner">
        <Link href="/" className="brand" data-qa="brand">
          <span className="brand-mark">A</span> Automation<strong>Store</strong>
        </Link>

        <nav className="main-nav" data-qa="nav">
          <Link href="/" data-qa="nav-home">Home</Link>
          <Link href="/products" data-qa="nav-products">Products</Link>
          <Link href="/cart" data-qa="nav-cart">
            Cart {count > 0 && <span className="cart-badge" data-qa="cart-count">{count}</span>}
          </Link>
          <Link href="/contact_us" data-qa="nav-contact">Contact us</Link>
          {user ? (
            <>
              <Link href="/orders" data-qa="nav-orders">My Orders</Link>
              <span className="nav-user" data-qa="logged-user">Logged in as {user.name}</span>
              <button
                className="nav-link-btn"
                data-qa="logout"
                onClick={() => { logout(); router.push('/') }}
              >
                Logout
              </button>
            </>
          ) : (
            <Link href="/login" data-qa="nav-login">Signup / Login</Link>
          )}
        </nav>
      </div>
    </header>
  )
}
