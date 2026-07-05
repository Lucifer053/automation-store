# AutomationStore

A demo e-commerce web app — a lightweight clone of [automationexercise.com](https://automationexercise.com/) — built as an **e2e test-automation target**. Same stack as the `vibeboard` project: **Next.js 14 (App Router) + Supabase + plain JS**, with a REST **API for every module**.

Every interactive element carries a `data-qa` attribute so UI test bots (e.g. the `site-scenario-mapper` executor) can select elements reliably.

## Stack
- **Next.js 14** (App Router, JavaScript — no TypeScript)
- **Supabase** (Postgres) via `@supabase/supabase-js`
- **bcryptjs** for password hashing
- Demo bearer token: `base64("<userId>:<email>")` (same scheme as vibeboard)

## Modules & APIs

| Module | UI page | API |
|---|---|---|
| **Auth** | `/login` (signup 2-step, login, logout, delete account) | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/verify`, `DELETE /api/auth/delete` |
| **Products** | `/`, `/products` (list, search, category, brand) | `GET /api/products[?search=&category=&subcategory=&brand=]`, `GET /api/products/[id]` |
| **Reviews** | `/products/[id]` | `GET`/`POST /api/products/[id]/reviews` |
| **Cart** | `/cart` (localStorage for guests) | `GET`/`POST`/`PUT`/`DELETE /api/cart` (auth — persistent per-user cart) |
| **Checkout / Orders** | `/checkout` (address → shipping → payment → confirm), `/orders/[id]` (+ invoice) | `POST /api/orders` (place order, auth), `GET /api/orders` (list), `GET /api/orders/[id]` |
| **Categories/Brands** | left sidebar | `GET /api/categories`, `GET /api/brands` |
| **Subscription** | footer | `POST /api/subscription` |
| **Contact** | `/contact_us` | `POST /api/contact` |
| **Locations** (TH จังหวัด/อำเภอ) | signup cascading dropdowns | `GET /api/locations/provinces`, `GET /api/locations/districts?province_id=` |

All API responses use the shape `{ success: true, data }` or `{ success: false, error }`.

## Setup

1. **Create a new Supabase project** named `automation-store` (as with vibeboard, a separate project).
2. In the SQL Editor, run in order:
   - `supabase/schema.sql`
   - `supabase/policies.sql`
   - `supabase/seed.sql`  ← seeds ~24 products across Women/Men/Kids + brands
   - `supabase/locations.sql`  ← Thai provinces (77) + districts (930) for the signup address dropdowns
   - `supabase/orders.sql`  ← orders + order_items tables for checkout/payment
   - (migration for an existing DB) `ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT;`
3. Copy env and fill in your keys (Settings → API):
   ```bash
   cp .env.local.example .env.local
   # NEXT_PUBLIC_SUPABASE_URL=...
   # NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
4. Install & run:
   ```bash
   npm install
   npm run dev          # http://localhost:4002
   ```

## Testing this app
- Import `automation-store.postman_collection.json` into Postman. Set `{{base_url}}` (default `http://localhost:4002`) and paste the `token` from a Login/Register response.
- For UI e2e: point `site-scenario-mapper` at `http://localhost:4002`. Elements expose `data-qa` (e.g. `login-email`, `signup-button`, `add-to-cart`, `search-product`, `submit-search`, `review-submit`, `cart-quantity`, `subscribe-email`).

## Notes
- Guest cart is client-side (localStorage), mirroring automationexercise. The `/api/cart` endpoints provide a **persistent per-user** cart for API-level testing.
- Auth is demo-grade (custom `users` table + base64 token), matching the vibeboard reference — not for production.
- Checkout/Payment/Order are intentionally out of scope (Core-commerce build).
