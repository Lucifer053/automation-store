-- ============================================================
-- automation-store — orders + order_items (checkout / payment)
-- Run AFTER schema.sql (+ policies.sql). Idempotent-ish (IF NOT EXISTS).
-- ============================================================

CREATE TABLE IF NOT EXISTS orders (
  id             BIGSERIAL PRIMARY KEY,
  user_id        BIGINT REFERENCES users(id) ON DELETE SET NULL,
  status         TEXT DEFAULT 'Pending',        -- Pending / Paid / Processing
  -- address snapshot (billing = shipping in this demo)
  full_name      TEXT,
  email          TEXT,
  phone          TEXT,
  address        TEXT,
  city           TEXT,
  state          TEXT,
  zipcode        TEXT,
  country        TEXT,
  -- fulfilment + payment
  shipping_method TEXT,
  payment_method  TEXT,
  card_last4      TEXT,
  -- money
  subtotal       NUMERIC(10,2) DEFAULT 0,
  shipping_cost  NUMERIC(10,2) DEFAULT 0,
  tax            NUMERIC(10,2) DEFAULT 0,
  total          NUMERIC(10,2) DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders (user_id);

CREATE TABLE IF NOT EXISTS order_items (
  id         BIGSERIAL PRIMARY KEY,
  order_id   BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
  name       TEXT,
  price      NUMERIC(10,2),
  quantity   INT NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);

ALTER TABLE orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- demo policies (API scopes by user_id)
CREATE POLICY "orders_select" ON orders FOR SELECT USING (true);
CREATE POLICY "orders_insert" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "order_items_select" ON order_items FOR SELECT USING (true);
CREATE POLICY "order_items_insert" ON order_items FOR INSERT WITH CHECK (true);
