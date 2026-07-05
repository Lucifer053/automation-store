import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// During build (or when env is missing) fall back to a dummy client so the
// project still compiles. Real config is required at runtime.
let supabase

if (!supabaseUrl || !supabaseKey) {
  if (process.env.NODE_ENV === 'production') {
    console.error('Missing Supabase environment variables in production!')
  }
  const notConfigured = () =>
    Promise.resolve({ data: null, error: new Error('Supabase not configured') })
  supabase = {
    from: () => ({
      select: () => ({ eq: notConfigured, order: notConfigured, ilike: notConfigured, single: notConfigured }),
      insert: () => ({ select: () => ({ single: notConfigured }) }),
      update: () => ({ eq: notConfigured }),
      delete: () => ({ eq: notConfigured }),
    }),
  }
} else {
  supabase = createClient(supabaseUrl, supabaseKey)
}

export { supabase }

// Database table names
export const TABLES = {
  USERS: 'users',
  PRODUCTS: 'products',
  REVIEWS: 'reviews',
  CART: 'cart_items',
  SUBSCRIPTIONS: 'subscriptions',
  CONTACTS: 'contacts',
  PROVINCES: 'provinces',
  DISTRICTS: 'districts',
  ORDERS: 'orders',
  ORDER_ITEMS: 'order_items',
}

export default supabase
