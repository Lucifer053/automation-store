'use client'

import { useState } from 'react'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [msg, setMsg] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setMsg(null)
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    setMsg({ ok: json.success, text: json.message || json.error })
    if (json.success) setForm({ name: '', email: '', subject: '', message: '' })
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 560, margin: '40px auto' }}>
        <h2 data-qa="contact-heading">Get In Touch</h2>
        {msg && <div className={msg.ok ? 'alert-success' : 'alert-error'} data-qa="contact-result">{msg.text}</div>}
        <form onSubmit={submit} data-qa="contact-form">
          <div className="form-field">
            <input placeholder="Name" value={form.name}
                   onChange={(e) => setForm({ ...form, name: e.target.value })} data-qa="contact-name" required />
          </div>
          <div className="form-field">
            <input type="email" placeholder="Email" value={form.email}
                   onChange={(e) => setForm({ ...form, email: e.target.value })} data-qa="contact-email" required />
          </div>
          <div className="form-field">
            <input placeholder="Subject" value={form.subject}
                   onChange={(e) => setForm({ ...form, subject: e.target.value })} data-qa="contact-subject" />
          </div>
          <div className="form-field">
            <textarea rows="5" placeholder="Your Message Here" value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })} data-qa="contact-message" required />
          </div>
          <button type="submit" className="btn btn-primary btn-block" data-qa="contact-submit">Submit</button>
        </form>
      </div>
    </div>
  )
}
