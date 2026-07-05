'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../src/contexts/AuthContext'

export default function LoginPage() {
  const { login, user, logout, deleteAccount } = useAuth()
  const router = useRouter()

  const [loginData, setLoginData] = useState({ email: '', password: '' })
  const [loginErr, setLoginErr] = useState(null)

  async function doLogin(e) {
    e.preventDefault()
    setLoginErr(null)
    const res = await login(loginData.email, loginData.password)
    if (res.success) router.push('/')
    else setLoginErr(res.error)
  }

  // already logged in
  if (user) {
    return (
      <div className="container">
        <div className="card" style={{ maxWidth: 480, margin: '50px auto' }} data-qa="account-panel">
          <h2>Account</h2>
          <p data-qa="logged-user">Logged in as <strong>{user.name}</strong> ({user.email})</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button className="btn btn-ghost" data-qa="logout" onClick={() => { logout(); router.push('/') }}>Logout</button>
            <button className="btn btn-danger" data-qa="delete-account"
                    onClick={async () => { await deleteAccount(); router.push('/') }}>
              Delete Account
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="auth-wrap">
        {/* ---- Login ---- */}
        <div className="card">
          <h2>Login to your account</h2>
          {loginErr && <div className="alert-error" data-qa="login-error">{loginErr}</div>}
          <form onSubmit={doLogin} data-qa="login-form">
            <div className="form-field">
              <input type="email" placeholder="Email Address" value={loginData.email}
                     onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                     data-qa="login-email" required />
            </div>
            <div className="form-field">
              <input type="password" placeholder="Password" value={loginData.password}
                     onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                     data-qa="login-password" required />
            </div>
            <button type="submit" className="btn btn-primary btn-block" data-qa="login-button">Login</button>
          </form>
        </div>

        {/* ---- New User: single button → /signup ---- */}
        <div className="card">
          <h2>New User Signup!</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            By creating an account you will be able to shop faster, track your orders,
            and keep a record of the products you have purchased.
          </p>
          <Link href="/signup" className="btn btn-primary btn-block" data-qa="signup-button" style={{ marginTop: 8 }}>
            Register
          </Link>
        </div>
      </div>
    </div>
  )
}
