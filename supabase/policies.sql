-- ============================================================
-- automation-store — Row Level Security policies
-- Run AFTER schema.sql. Demo policies: open access via anon key
-- (the API layer handles validation/auth, same approach as vibeboard).
-- ============================================================

ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE products      ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts      ENABLE ROW LEVEL SECURITY;

-- USERS: allow register / login-lookup / update / delete (demo)
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "users_select" ON users FOR SELECT USING (true);
CREATE POLICY "users_update" ON users FOR UPDATE USING (true);
CREATE POLICY "users_delete" ON users FOR DELETE USING (true);

-- PRODUCTS: public read only
CREATE POLICY "products_select" ON products FOR SELECT USING (true);

-- REVIEWS: public read + create
CREATE POLICY "reviews_select" ON reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert" ON reviews FOR INSERT WITH CHECK (true);

-- CART: full access (API scopes by user_id)
CREATE POLICY "cart_select" ON cart_items FOR SELECT USING (true);
CREATE POLICY "cart_insert" ON cart_items FOR INSERT WITH CHECK (true);
CREATE POLICY "cart_update" ON cart_items FOR UPDATE USING (true);
CREATE POLICY "cart_delete" ON cart_items FOR DELETE USING (true);

-- SUBSCRIPTIONS: create + read
CREATE POLICY "subs_insert" ON subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "subs_select" ON subscriptions FOR SELECT USING (true);

-- CONTACTS: create + read-back (the API does insert().select())
CREATE POLICY "contacts_insert" ON contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "contacts_select" ON contacts FOR SELECT USING (true);
