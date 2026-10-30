const { expect } = require('@playwright/test')

async function login(request, { email, password }) {
  const res = await request.post('/api/auth/login', { data: { email, password } })
  expect(res.status(), 'login').toBe(200)
  const { data } = await res.json()
  return { token: data.token, user: data.user }
}

async function getProducts(request) {
  const res = await request.get('/api/products')
  expect(res.status()).toBe(200)
  return (await res.json()).data
}

const auth = (token) => ({ Authorization: `Bearer ${token}` })

const DEFAULT_ADDRESS = {
  full_name: 'QA Tester', email: '', phone: '0812345678', address: '1 Test Road',
  city: 'Bang Rak', state: 'Bangkok', zipcode: '10500', country: 'Thailand',
}

// POST /api/orders then GET it back -> full order record (items, created_at, ...)
async function createOrder(request, token, o) {
  const body = {
    items: o.items, address: { ...DEFAULT_ADDRESS, ...(o.address || {}) },
    shipping_method: o.shipping_method || 'Ground',
    payment_method: o.payment_method || 'Check / Money Order',
    card: o.card,
  }
  const res = await request.post('/api/orders', { headers: auth(token), data: body })
  expect(res.status(), `create order: ${await res.text()}`).toBe(201)
  const { data } = await res.json()
  return getOrder(request, token, data.id)
}

async function getOrder(request, token, id) {
  const res = await request.get(`/api/orders/${id}`, { headers: auth(token) })
  expect(res.status()).toBe(200)
  return (await res.json()).data
}

const getPdf = (request, token, id) =>
  request.get(`/api/orders/${id}/pdf`, { headers: token ? auth(token) : {} })

module.exports = { login, getProducts, createOrder, getOrder, getPdf, auth, DEFAULT_ADDRESS }
