'use client'

import { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('as_auth')
      if (raw) {
        const parsed = JSON.parse(raw)
        setUser(parsed.user)
        setToken(parsed.token)
      }
    } catch {}
    setLoading(false)
  }, [])

  function persist(user, token) {
    setUser(user)
    setToken(token)
    localStorage.setItem('as_auth', JSON.stringify({ user, token }))
  }

  async function login(email, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const json = await res.json()
    if (json.success) persist(json.data.user, json.data.token)
    return json
  }

  async function register(payload) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (json.success) persist(json.data.user, json.data.token)
    return json
  }

  async function deleteAccount() {
    const res = await fetch('/api/auth/delete', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json()
    if (json.success) logout()
    return json
  }

  function logout() {
    setUser(null)
    setToken(null)
    localStorage.removeItem('as_auth')
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
