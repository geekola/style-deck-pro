# StyleDeck — Architecture

*Solo build. MVP-first. TypeScript throughout.*

---

## Infrastructure

| Layer | Service | Notes |
|---|---|---|
| Frontend + API | **Vercel** (Next.js 15) | App Router, API Routes, Edge middleware |
| Database | **Railway** (PostgreSQL 16) | Managed, auto-backups, connection pooling via PgBouncer |
| File Storage | **Vercel Blob** | Product images, PDF invoices |
| Auth | **Better Auth** | Email + Google OAuth, session management |
| Payments | **Stripe** | Checkout, webhooks |
| Email | **Resend** | Order receipts, brand notifications |
| ORM | **Drizzle ORM** | TypeScript-native, lightweight, fast migrations |

**Why this split:** Next.js on Vercel handles the full application (frontend + backend API routes). Railway is purely the database. No separate API server to maintain — keeps solo ops simple.

---

## Repo Structure

```
styledeck/
├── app/
│   ├── (customer)/          # Customer-facing routes
│   ├── (brand)/             # Brand portal routes
│   ├── (admin)/             # Platform admin routes
│   └── api/                 # API route handlers
├── components/
├── lib/
│   ├── auth.ts              # Better Auth config
│   ├── db/
│   │   ├── schema.ts        # Drizzle schema (single source of truth)
│   │   └── index.ts         # DB client
│   ├── stripe.ts
│   └── resend.ts
├── middleware.ts             # RBAC enforcement at edge
└── drizzle.config.ts
```

---

## Auth & RBAC

### Roles

| Role | Scope |
|---|---|
| `platform_admin` | Full platform access |
| `brand_admin` | Scoped to their brand only |
| `customer` | Scoped to products they have access to |

### How it works

1. Better Auth handles session creation (email/password + Google OAuth)
2. `middleware.ts` reads session, checks role, redirects if unauthorized
3. Every API route re-validates authorization server-side — never trust the client
4. Brand admins get a `brandId` claim in their session; all queries filter by it

### Route protection

```
/app/*          → requires customer role
/brand/*        → requires brand_admin role (+ brandId match)
/admin/*        → requires platform_admin role
/api/brand/*    → server-side brandId check on every handler
```

---

## Database Schema

### Core tables

```sql
-- Auth (managed by Better Auth)
users            (id, email, name, role, email_verified, created_at)
sessions         (id, user_id, expires_at, ...)
accounts         (id, user_id, provider, ...)

-- Customer profile
customers        (id, user_id, type, industry, status, created_at)
measurements     (id, customer_id, unit_system,
                  -- shared fields
                  height, weight, shoe_size,
                  -- torso
                  chest, waist, hips,
                  -- male-variant
                  neck, shoulder_width, sleeve_length, inseam,
                  updated_at)
               -- all measurement fields nullable; unit_system: 'metric' | 'imperial'

-- Brand
brands           (id, name, category, admin_email, fulfilment_email,
                  status, access_policy, created_at)
brand_admins     (id, user_id, brand_id)

-- Products
products         (id, brand_id, name, category, item_type,
                  cost_price, price, return_policy, description,
                  active, created_at)
product_images   (id, product_id, url, hero, display_order)

-- Invites
invites          (id, email, source, brand_id, token, status, expires_at, created_at)
               -- source: 'platform_admin' | 'brand'
               -- brand_id: null for platform_admin invites; set for brand invites
               -- status: 'pending' | 'accepted' | 'expired'
               -- on accept: create user, create customer, create brand_access if brand_id present

-- Access & Gifting
brand_access     (id, brand_id, customer_id, granted_at)
               -- access_policy=open: all customers implicitly have access
               -- access_policy=selective|invite_only: explicit rows required
               -- policy switch Open→Selective/InviteOnly: existing rows grandfathered in

gifting_allowances (id, brand_id, customer_id, period_type,
                    amount_cents, used_cents, period_start, manual_reset_at)

-- Discovery
swipe_events     (id, customer_id, product_id, direction, swiped_at)
saved_products   (id, customer_id, product_id, saved_at)

-- Orders
orders           (id, customer_id, product_id, brand_id, order_type,
                  status, stripe_payment_intent_id,
                  amount_cents, tracking_number,
                  shipping_address jsonb,
                  created_at, shipped_at)
               -- status: 'pending' | 'shipped'
               -- order_type: 'purchase' | 'gift'
               -- shipping_address: captured at checkout for gift orders

-- Audit
audit_logs       (id, actor_id, action, entity_type, entity_id,
                  metadata jsonb, ip, created_at)
```

### Key design decisions

- `cost_price` never returned in any customer-facing API response
- `gifting_allowances` never returned to customers — only used server-side to gate gift orders
- All brand queries include `WHERE brand_id = $session.brandId` — enforced in a shared query helper, not left to individual handlers
- `audit_logs` write-only for all actions: product changes, access grants, order status changes, admin actions
- Discovery feed is access-gated: customers only see products from brands with an `brand_access` row (or `access_policy=open`)
- Swipe events are permanent: once swiped, product never re-enters the feed
- Saved gallery hides products when brand revokes customer access (query-time filter, not deletion)
- Measurements are predefined fields (not free-form JSON): height, weight, chest, waist, hips, inseam, shoulder_width, sleeve_length, neck, shoe_size — with male/female field variants
- Customers must complete measurement profile before placing any order (purchase or gift)
- Gift checkout: customer confirms shipping address then submits — no price shown
- Order statuses: `pending` → `shipped` (brand adds tracking number). Simple two-state flow.
- Invite flow: single `invites` table handles both platform_admin and brand invites; same registration UI; post-registration handler grants brand_access if brand_id present

---

## API Design

REST with Next.js API Routes. Key route groups:

```
POST   /api/auth/*                   Better Auth handlers

POST   /api/invites                  Create invite (platform_admin or brand_admin)
GET    /api/invites/[token]          Validate invite token (used on registration page)
POST   /api/invites/[token]/accept   Complete registration + grant access if brand invite

GET    /api/customer/products        Discovery feed (filtered, paginated)
POST   /api/customer/swipe           Record swipe event
GET    /api/customer/saved           Saved products
POST   /api/customer/orders          Create order (purchase or gift)
GET    /api/customer/measurements    Get profile
PUT    /api/customer/measurements    Update profile

GET    /api/brand/products           Brand's product list
POST   /api/brand/products           Create product
PUT    /api/brand/products/[id]      Update product
DELETE /api/brand/products/[id]      Delete product
POST   /api/brand/products/import    CSV import
GET    /api/brand/customers          Accessible customers
POST   /api/brand/access             Grant/revoke access
GET    /api/brand/gifting            Allowance overview
PUT    /api/brand/gifting/[id]       Update allowance
GET    /api/brand/orders             Order list + fulfillment
PUT    /api/brand/orders/[id]        Update order status

GET    /api/admin/brands             All brands
PUT    /api/admin/brands/[id]        Approve/reject
GET    /api/admin/users              All users
GET    /api/admin/audit              Audit log
POST   /api/admin/invites            Send platform-level customer invite

POST   /api/webhooks/stripe          Payment webhooks
```

---

## Stripe Integration

- **Purchase flow:** Customer initiates → create PaymentIntent server-side → Stripe Checkout or Elements → webhook confirms → order marked `paid` → brand notified
- **Gift flow:** Server-side allowance check → order created directly (no payment) → brand notified
- Stripe webhook handler validates signature before processing

---

## Build Order (MVP)

Work in this sequence — each phase is independently shippable:

### Phase 1 — Foundation
1. Next.js project scaffold + Drizzle + Railway Postgres
2. Better Auth (email + Google)
3. Role-based middleware
4. Database migrations (full schema)

### Phase 2 — Brand Portal
5. Brand registration + platform admin approval flow
6. Product CRUD + image upload
7. Access policies
8. Gifting allowance management

### Phase 3 — Customer Experience
9. Customer registration + measurement profile
10. Discovery feed + swipe engine
11. Saved gallery
12. Purchase checkout (Stripe)
13. Gift order flow

### Phase 4 — Operations
14. Order management + fulfillment workflow
15. Email notifications (Resend)
16. PDF invoice generation
17. Platform admin dashboard + audit logs

### Phase 5 — Polish
18. CSV product import
19. Measurement PDF export
20. Error handling, loading states, empty states

---

## Security Checklist

- [ ] All API routes validate session and role before any DB query
- [ ] `cost_price` and `gifting_allowances` stripped from all customer responses
- [ ] Brand data isolation enforced via shared query helpers (never ad-hoc)
- [ ] Stripe webhook signature validation
- [ ] PII encrypted at rest (Postgres encryption + Vercel env secrets)
- [ ] Audit log on all mutations
- [ ] GDPR: data export endpoint + account deletion (soft delete → scheduled purge)
- [ ] Rate limiting on auth endpoints (Better Auth built-in + Vercel edge)
- [ ] `HttpOnly` + `Secure` + `SameSite=Strict` on session cookies

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# Auth
BETTER_AUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXTAUTH_URL=

# Storage
BLOB_READ_WRITE_TOKEN=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PUBLISHABLE_KEY=

# Email
RESEND_API_KEY=
FROM_EMAIL=

# App
NEXT_PUBLIC_APP_URL=
```

---

## Decisions

1. **Measurement profile** — Predefined fields with male/female field sets (not free-form JSON).
2. **Gift order UX** — Customer sees "Gift" label explicitly; must confirm shipping address before submitting.
3. **Discovery feed** — Random shuffle within category for MVP. Access-gated per brand.
4. **Platform admin** — Same auth system as all users; role stored in `users.role` column. First admin created via seed script (`scripts/seed-admin.ts`).
5. **Customer registration** — Invite-only. Brands and platform admins both send invites. Single invite flow; brand invites auto-grant brand access on registration.
6. **Access policy changes** — Existing `brand_access` rows grandfathered in when policy tightens.
7. **Swiped products** — Never re-enter the discovery feed (permanent exclusion via `swipe_events`).
8. **Saved gallery + revoked access** — Products hidden at query time if brand access is revoked.
9. **Order fulfillment** — Two statuses only: `pending` → `shipped`. Brand adds tracking number when marking shipped.
