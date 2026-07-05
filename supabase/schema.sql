-- ============================================================
-- automation-store — Supabase schema
-- Run this FIRST in the Supabase SQL Editor, then policies.sql, then seed.sql
-- ============================================================

-- ---------- USERS ----------
-- Custom users table (demo-style auth, same pattern as vibeboard).
-- Password is bcrypt-hashed by the API before it reaches here.
CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password      TEXT NOT NULL,
  title         TEXT,                 -- Mr / Mrs
  gender        TEXT,                 -- Male / Female
  birth_day     INT,
  birth_month   INT,
  birth_year    INT,
  first_name    TEXT,
  last_name     TEXT,
  company       TEXT,
  address1      TEXT,
  address2      TEXT,
  country       TEXT,
  state         TEXT,
  city          TEXT,
  zipcode       TEXT,
  mobile_number TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ---------- PRODUCTS ----------
CREATE TABLE IF NOT EXISTS products (
  id           BIGSERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  price        NUMERIC(10,2) NOT NULL DEFAULT 0,
  brand        TEXT,
  category     TEXT,                  -- Women / Men / Kids
  subcategory  TEXT,                  -- Tops / Dress / Tshirts / Jeans ...
  image_url    TEXT,
  description  TEXT,
  availability TEXT DEFAULT 'In Stock',
  condition    TEXT DEFAULT 'New',
  created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products (brand);
CREATE INDEX IF NOT EXISTS idx_products_name ON products (name);

-- ---------- REVIEWS ----------
CREATE TABLE IF NOT EXISTS reviews (
  id         BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  review     TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews (product_id);

-- ---------- CART ITEMS (persistent cart for logged-in users) ----------
CREATE TABLE IF NOT EXISTS cart_items (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity   INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_cart_user ON cart_items (user_id);

-- ---------- SUBSCRIPTIONS (newsletter) ----------
CREATE TABLE IF NOT EXISTS subscriptions (
  id         BIGSERIAL PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------- CONTACTS (Contact Us) ----------
CREATE TABLE IF NOT EXISTS contacts (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  subject    TEXT,
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
