'use client'

import { useState } from 'react'

export default function Footer() {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState(null)

  async function subscribe(e) {
    e.preventDefault()
    setMsg(null)
    const res = await fetch('/api/subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const json = await res.json()
    setMsg({ ok: json.success, text: json.message || json.error })
    if (json.success) setEmail('')
  }

  return (
    <footer className="site-footer" data-qa="footer">
      <div className="container footer-inner">
        <div className="subscription" data-qa="subscription">
          <h2>Subscription</h2>
          <form className="subscribe-form" onSubmit={subscribe} data-qa="subscribe-form">
            <input
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-qa="subscribe-email"
              required
            />
            <button type="submit" data-qa="subscribe-button" aria-label="subscribe">➤</button>
          </form>
          {msg && (
            <div className={msg.ok ? 'alert-success' : 'alert-error'} data-qa="subscribe-result">
              {msg.text}
            </div>
          )}
        </div>
        <p className="copyright">Copyright © 2026 AutomationStore — a demo e-commerce app for e2e testing.</p>
      </div>
    </footer>
  )
}
