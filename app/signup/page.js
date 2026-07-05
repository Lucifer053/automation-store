'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../src/contexts/AuthContext'

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
// year of birth: newest = must be at least 18 years old (currentYear - 18),
// going 100 years back; auto-updates every year
const MAX_BIRTH_YEAR = new Date().getFullYear() - 18
const YEARS = Array.from({ length: 100 }, (_, i) => MAX_BIRTH_YEAR - i)

export default function SignupPage() {
  const { register } = useAuth()
  const router = useRouter()

  const [account, setAccount] = useState({
    gender: 'Male', name: '', email: '', password: '', confirm_password: '',
    birth_day: '', birth_month: '', birth_year: '',
    first_name: '', last_name: '', address1: '', address2: '',
    country: 'Thailand', state: '', city: '', zipcode: '', mobile_number: '',
  })
  const [errors, setErrors] = useState({})   // { field: message, general: message }
  const [created, setCreated] = useState(false)

  // cascading location
  const [provinces, setProvinces] = useState([])
  const [districts, setDistricts] = useState([])
  const [provinceId, setProvinceId] = useState('')

  useEffect(() => {
    fetch('/api/locations/provinces').then((r) => r.json()).then((j) => j.success && setProvinces(j.data))
  }, [])

  function set(k, v) {
    setAccount((a) => ({ ...a, [k]: v }))
    setErrors((e) => { if (!e[k]) return e; const n = { ...e }; delete n[k]; return n }) // clear field error on edit
  }

  function setDob(k, v) {
    setAccount((a) => ({ ...a, [k]: v }))
    setErrors((e) => { if (!e.dob) return e; const n = { ...e }; delete n.dob; return n })
  }

  function onProvinceChange(e) {
    const id = e.target.value
    const p = provinces.find((x) => String(x.id) === id)
    setProvinceId(id)
    setDistricts([])
    setAccount((a) => ({ ...a, state: p ? p.name_th : '', city: '' }))
    setErrors((e) => { const n = { ...e }; delete n.state; delete n.city; return n })
    if (id) {
      fetch(`/api/locations/districts?province_id=${id}`).then((r) => r.json())
        .then((j) => j.success && setDistricts(j.data))
    }
  }

  async function createAccount(e) {
    e.preventDefault()

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const errs = {}
    // account
    if (!account.name.trim()) errs.name = 'Please enter your username'
    if (!emailRegex.test(account.email)) errs.email = 'Please enter a valid email address'
    if (account.password.length < 6) errs.password = 'Password must be at least 6 characters long'
    if (account.password !== account.confirm_password) errs.confirm_password = 'Passwords do not match'
    // date of birth + age >= 18
    const { birth_day: d, birth_month: m, birth_year: y } = account
    if (!d || !m || !y) {
      errs.dob = 'Please select your date of birth'
    } else {
      const today = new Date()
      let age = today.getFullYear() - Number(y)
      const monthDiff = (today.getMonth() + 1) - Number(m)
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < Number(d))) age--
      if (age < 18) errs.dob = 'You must be at least 18 years old'
    }
    // delivery info (required to place a real order)
    if (!account.first_name.trim()) errs.first_name = 'Please enter your first name'
    if (!account.last_name.trim()) errs.last_name = 'Please enter your last name'
    if (!account.address1.trim()) errs.address1 = 'Please enter your address'
    if (!account.state) errs.state = 'Please select a province'
    if (!account.city) errs.city = 'Please select a district'
    if (!/^\d{5}$/.test(account.zipcode)) errs.zipcode = 'Zipcode must be 5 digits'
    if (!/^\d{9,10}$/.test(account.mobile_number)) errs.mobile_number = 'Mobile number must be 9–10 digits'
    if (Object.keys(errs).length) { setErrors(errs); return }

    const check = await fetch('/api/auth/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: account.email }),
    }).then((r) => r.json())
    if (check.data?.exists) { setErrors({ email: 'Email Address already exist!' }); return }

    const res = await register(account)
    if (res.success) setCreated(true)
    else setErrors({ general: res.error })
  }

  // ---- success ----
  if (created) {
    return (
      <div className="container">
        <div className="card center" style={{ maxWidth: 480, margin: '60px auto' }} data-qa="account-created">
          <h2>Account Created!</h2>
          <p className="muted">Your account has been created successfully.</p>
          <button className="btn btn-primary" data-qa="continue" onClick={() => router.push('/')}>Continue</button>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 640, margin: '40px auto' }}>
        <h2 data-qa="account-info-heading">Enter Account Information</h2>
        {errors.general && <div className="alert-error" data-qa="signup-error">{errors.general}</div>}
        <form onSubmit={createAccount} data-qa="account-form">
          <div className="form-field">
            <label>Gender</label>
            <div className="radio-row" data-qa="gender">
              <label className="radio-opt">
                <input type="radio" name="gender" value="Male"
                       checked={account.gender === 'Male'} onChange={(e) => set('gender', e.target.value)}
                       data-qa="gender-male" /> Male
              </label>
              <label className="radio-opt">
                <input type="radio" name="gender" value="Female"
                       checked={account.gender === 'Female'} onChange={(e) => set('gender', e.target.value)}
                       data-qa="gender-female" /> Female
              </label>
            </div>
          </div>
          <div className="form-field">
            <label>Username *</label>
            <input className={errors.name ? 'input-error' : ''} placeholder="Username" value={account.name}
                   onChange={(e) => set('name', e.target.value)} data-qa="name" required />
            {errors.name && <p className="field-error" data-qa="error-name">{errors.name}</p>}
          </div>
          <div className="form-field">
            <label>Email *</label>
            <input className={errors.email ? 'input-error' : ''} type="email" placeholder="Email Address" value={account.email}
                   onChange={(e) => set('email', e.target.value)} data-qa="email" required />
            {errors.email && <p className="field-error" data-qa="error-email">{errors.email}</p>}
          </div>
          <div className="row-2">
            <div className="form-field">
              <label>Password *</label>
              <input className={errors.password ? 'input-error' : ''} type="password" placeholder="Password" value={account.password}
                     onChange={(e) => set('password', e.target.value)} data-qa="password" required />
              {errors.password && <p className="field-error" data-qa="error-password">{errors.password}</p>}
            </div>
            <div className="form-field">
              <label>Confirm Password *</label>
              <input className={errors.confirm_password ? 'input-error' : ''} type="password" placeholder="Confirm Password" value={account.confirm_password}
                     onChange={(e) => set('confirm_password', e.target.value)} data-qa="confirm-password" required />
              {errors.confirm_password && <p className="field-error" data-qa="error-confirm-password">{errors.confirm_password}</p>}
            </div>
          </div>

          <div className="form-field">
            <label>Date of Birth *</label>
            <div className="row-3">
              <select className={errors.dob ? 'input-error' : ''} value={account.birth_day} onChange={(e) => setDob('birth_day', e.target.value)} data-qa="days">
                <option value="">Day</option>
                {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <select className={errors.dob ? 'input-error' : ''} value={account.birth_month} onChange={(e) => setDob('birth_month', e.target.value)} data-qa="months">
                <option value="">Month</option>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
              <select className={errors.dob ? 'input-error' : ''} value={account.birth_year} onChange={(e) => setDob('birth_year', e.target.value)} data-qa="years">
                <option value="">Year</option>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {errors.dob && <p className="field-error" data-qa="error-dob">{errors.dob}</p>}
          </div>

          <div className="row-2">
            <div className="form-field">
              <label>First name *</label>
              <input className={errors.first_name ? 'input-error' : ''} value={account.first_name}
                     onChange={(e) => set('first_name', e.target.value)} data-qa="first_name" />
              {errors.first_name && <p className="field-error" data-qa="error-first_name">{errors.first_name}</p>}
            </div>
            <div className="form-field">
              <label>Last name *</label>
              <input className={errors.last_name ? 'input-error' : ''} value={account.last_name}
                     onChange={(e) => set('last_name', e.target.value)} data-qa="last_name" />
              {errors.last_name && <p className="field-error" data-qa="error-last_name">{errors.last_name}</p>}
            </div>
          </div>
          <div className="form-field">
            <label>Address *</label>
            <input className={errors.address1 ? 'input-error' : ''} value={account.address1}
                   onChange={(e) => set('address1', e.target.value)} data-qa="address" />
            {errors.address1 && <p className="field-error" data-qa="error-address">{errors.address1}</p>}
          </div>

          <div className="form-field">
            <label>Country</label>
            <select value={account.country} onChange={(e) => set('country', e.target.value)} data-qa="country">
              <option value="Thailand">Thailand</option>
            </select>
          </div>

          <div className="row-3">
            <div className="form-field">
              <label>State / Province (จังหวัด) *</label>
              <select className={errors.state ? 'input-error' : ''} value={provinceId} onChange={onProvinceChange} data-qa="state">
                <option value="">Select province</option>
                {provinces.map((p) => <option key={p.id} value={p.id}>{p.name_th}</option>)}
              </select>
              {errors.state && <p className="field-error" data-qa="error-state">{errors.state}</p>}
            </div>
            <div className="form-field">
              <label>City / District (อำเภอ) *</label>
              <select className={errors.city ? 'input-error' : ''} value={account.city} onChange={(e) => set('city', e.target.value)} data-qa="city"
                      disabled={!provinceId}>
                <option value="">{provinceId ? 'Select district' : 'Select province first'}</option>
                {districts.map((d) => <option key={d.id} value={d.name_th}>{d.name_th}</option>)}
              </select>
              {errors.city && <p className="field-error" data-qa="error-city">{errors.city}</p>}
            </div>
            <div className="form-field">
              <label>Zipcode *</label>
              <input className={errors.zipcode ? 'input-error' : ''} value={account.zipcode}
                     onChange={(e) => set('zipcode', e.target.value)} data-qa="zipcode" inputMode="numeric" maxLength={5} />
              {errors.zipcode && <p className="field-error" data-qa="error-zipcode">{errors.zipcode}</p>}
            </div>
          </div>

          <div className="form-field">
            <label>Mobile Number *</label>
            <input className={errors.mobile_number ? 'input-error' : ''} value={account.mobile_number}
                   onChange={(e) => set('mobile_number', e.target.value)} data-qa="mobile_number" inputMode="numeric" maxLength={10} />
            {errors.mobile_number && <p className="field-error" data-qa="error-mobile_number">{errors.mobile_number}</p>}
          </div>

          <button type="submit" className="btn btn-primary btn-block" data-qa="create-account">Create Account</button>
          <p className="muted center" style={{ marginTop: 16 }}>
            Already have an account? <Link href="/login" data-qa="to-login" style={{ color: 'var(--brand)' }}>Login</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
