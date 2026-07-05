import { supabase, TABLES } from '../lib/supabase'

// Uniform wrapper so every call returns { success, data } | { success, error }
async function run(promise, fallback = 'Request failed') {
  try {
    const { data, error } = await promise
    if (error) {
      if (error.code === 'PGRST116') return { success: false, error: 'Not found', notFound: true }
      console.error('Supabase error:', error)
      return { success: false, error: error.message || fallback }
    }
    return { success: true, data }
  } catch (error) {
    console.error(fallback, error)
    return { success: false, error: 'Network error. Please try again.' }
  }
}

// ---------------------------------------------------------------- USERS
export const userAPI = {
  createUser(userData) {
    return run(supabase.from(TABLES.USERS).insert([userData]).select().single(), 'Failed to create user')
  },
  getUserByEmail(email) {
    return run(supabase.from(TABLES.USERS).select('*').eq('email', email).single(), 'Failed to get user')
  },
  getUserById(id) {
    return run(supabase.from(TABLES.USERS).select('*').eq('id', id).single(), 'Failed to get user')
  },
  updateUser(id, fields) {
    return run(supabase.from(TABLES.USERS).update(fields).eq('id', id).select().single(), 'Failed to update user')
  },
  deleteUser(id) {
    return run(supabase.from(TABLES.USERS).delete().eq('id', id), 'Failed to delete user')
  },
  async checkEmailExists(email) {
    const { data } = await supabase.from(TABLES.USERS).select('id').eq('email', email).maybeSingle()
    return { exists: !!data }
  },
}

// ---------------------------------------------------------------- PRODUCTS
export const productAPI = {
  async getAllProducts({ search, category, brand, subcategory } = {}) {
    let q = supabase.from(TABLES.PRODUCTS).select('*').order('id', { ascending: true })
    if (search) q = q.ilike('name', `%${search}%`)
    if (category) q = q.eq('category', category)
    if (subcategory) q = q.eq('subcategory', subcategory)
    if (brand) q = q.eq('brand', brand)
    return run(q, 'Failed to get products')
  },
  getProductById(id) {
    return run(supabase.from(TABLES.PRODUCTS).select('*').eq('id', id).single(), 'Failed to get product')
  },
  async getBrands() {
    const res = await run(supabase.from(TABLES.PRODUCTS).select('brand'), 'Failed to get brands')
    if (!res.success) return res
    const counts = {}
    for (const r of res.data || []) if (r.brand) counts[r.brand] = (counts[r.brand] || 0) + 1
    return { success: true, data: Object.entries(counts).map(([brand, count]) => ({ brand, count })) }
  },
  async getCategories() {
    const res = await run(supabase.from(TABLES.PRODUCTS).select('category, subcategory'), 'Failed to get categories')
    if (!res.success) return res
    const tree = {}
    for (const r of res.data || []) {
      if (!r.category) continue
      tree[r.category] = tree[r.category] || new Set()
      if (r.subcategory) tree[r.category].add(r.subcategory)
    }
    return { success: true, data: Object.entries(tree).map(([category, subs]) => ({ category, subcategories: [...subs] })) }
  },
}

// ---------------------------------------------------------------- REVIEWS
export const reviewAPI = {
  getReviewsByProduct(productId) {
    return run(
      supabase.from(TABLES.REVIEWS).select('*').eq('product_id', productId).order('created_at', { ascending: false }),
      'Failed to get reviews'
    )
  },
  createReview(review) {
    return run(supabase.from(TABLES.REVIEWS).insert([review]).select().single(), 'Failed to create review')
  },
}

// ---------------------------------------------------------------- CART (persistent, per user)
export const cartAPI = {
  getCart(userId) {
    return run(
      supabase.from(TABLES.CART).select('*, product:products(*)').eq('user_id', userId).order('id', { ascending: true }),
      'Failed to get cart'
    )
  },
  async addItem(userId, productId, quantity = 1) {
    const { data: existing } = await supabase
      .from(TABLES.CART).select('*').eq('user_id', userId).eq('product_id', productId).maybeSingle()
    if (existing) {
      return run(
        supabase.from(TABLES.CART).update({ quantity: existing.quantity + quantity }).eq('id', existing.id).select().single(),
        'Failed to update cart'
      )
    }
    return run(
      supabase.from(TABLES.CART).insert([{ user_id: userId, product_id: productId, quantity }]).select().single(),
      'Failed to add to cart'
    )
  },
  updateItem(userId, productId, quantity) {
    return run(
      supabase.from(TABLES.CART).update({ quantity }).eq('user_id', userId).eq('product_id', productId).select().single(),
      'Failed to update cart item'
    )
  },
  removeItem(userId, productId) {
    return run(
      supabase.from(TABLES.CART).delete().eq('user_id', userId).eq('product_id', productId),
      'Failed to remove cart item'
    )
  },
}

// ---------------------------------------------------------------- SUBSCRIPTION
export const subscriptionAPI = {
  async subscribe(email) {
    const { data: existing } = await supabase.from(TABLES.SUBSCRIPTIONS).select('id').eq('email', email).maybeSingle()
    if (existing) return { success: true, data: existing, already: true }
    return run(supabase.from(TABLES.SUBSCRIPTIONS).insert([{ email }]).select().single(), 'Failed to subscribe')
  },
}

// ---------------------------------------------------------------- LOCATIONS (Thailand)
export const locationAPI = {
  getProvinces() {
    return run(
      supabase.from(TABLES.PROVINCES).select('id, name_th, name_en').order('name_th', { ascending: true }),
      'Failed to get provinces'
    )
  },
  getDistricts(provinceId) {
    return run(
      supabase.from(TABLES.DISTRICTS).select('id, name_th, name_en').eq('province_id', provinceId).order('name_th', { ascending: true }),
      'Failed to get districts'
    )
  },
}

// ---------------------------------------------------------------- ORDERS
export const orderAPI = {
  // create order + items in one go; items = [{product_id, name, price, quantity}]
  async createOrder(order, items) {
    const res = await run(supabase.from(TABLES.ORDERS).insert([order]).select().single(), 'Failed to create order')
    if (!res.success) return res
    const rows = items.map((i) => ({
      order_id: res.data.id, product_id: i.product_id, name: i.name, price: i.price, quantity: i.quantity,
    }))
    const itemsRes = await run(supabase.from(TABLES.ORDER_ITEMS).insert(rows).select(), 'Failed to save order items')
    if (!itemsRes.success) return itemsRes
    return { success: true, data: { ...res.data, items: itemsRes.data } }
  },
  getOrderById(id) {
    return run(
      supabase.from(TABLES.ORDERS).select('*, items:order_items(*)').eq('id', id).single(),
      'Failed to get order'
    )
  },
  getUserOrders(userId) {
    return run(
      supabase.from(TABLES.ORDERS).select('*, items:order_items(*)').eq('user_id', userId).order('id', { ascending: false }),
      'Failed to get orders'
    )
  },
}

// ---------------------------------------------------------------- CONTACT
export const contactAPI = {
  createContact(contact) {
    return run(supabase.from(TABLES.CONTACTS).insert([contact]).select().single(), 'Failed to send message')
  },
}
