# Deployment & Production Operations Guide

This guide covers the complete production deployment of the Shoe Store platform, including Supabase database setup, backend hosting, frontend static hosting, environment configuration, and operational procedures.

---

## 1. Architecture

```
Browser
   │
   │ HTTPS
   ▼
Frontend (Static SPA — React + Vite)
   │
   │ HTTPS API (VITE_API_URL)
   ▼
Backend (NestJS — Node.js application host)
   │
   │ Prisma ORM
   ▼
Supabase PostgreSQL (Managed Database)
```

> [!IMPORTANT]
> The React frontend **never** connects directly to the database. All database access goes through the NestJS backend. Do not add `DATABASE_URL` or any Supabase connection string to frontend environment variables.

### Recommended Hosting Providers

| Component | Target | Example Providers |
|-----------|--------|-------------------|
| **Frontend** | Static Site / CDN | Netlify, Cloudflare Pages, Vercel, AWS CloudFront |
| **Backend** | Node.js / Container host | Railway, Render, Fly.io, AWS ECS, VPS |
| **Database** | Managed PostgreSQL | **Supabase** (primary), Neon, Railway Postgres |

---

## 2. Supabase Database Setup

### 2.1 Create a Supabase Project

1. Create a new project at [supabase.com](https://supabase.com).
2. Wait for the project to initialize.
3. Navigate to **Project Settings → Database → Connection**.

### 2.2 Obtain Connection Strings

Supabase provides two connection modes via **Supavisor** (their connection pooler):

| Mode | Purpose | When to Use |
|------|---------|-------------|
| **Session Pooler** | Persistent connections, compatible with Prisma | Long-running Node.js hosts (Railway, Render, VPS) |
| **Transaction Pooler** | Stateless short connections | Serverless/autoscaling (Vercel Functions, Lambda) |
| **Direct Connection** | Non-pooled, full PostgreSQL | Prisma migration CLI only |

**For a standard Node.js host (Railway, Render, Fly.io), use Session Pooler for runtime:**

```
# In Supabase Dashboard → Project Settings → Database → Connection pooling
# Session mode pooler connection string:
postgresql://postgres.PROJECTREF:[PASSWORD]@aws-0-REGION.pooler.supabase.com:5432/postgres
```

**For Prisma migration CLI (`npx prisma migrate deploy`), use the Direct connection:**

```
# In Supabase Dashboard → Project Settings → Database → Connection string (URI)
# Direct (non-pooled) connection:
postgresql://postgres:[PASSWORD]@db.PROJECTREF.supabase.co:5432/postgres
```

> [!WARNING]
> **Never commit Supabase passwords or connection strings to source control.** Configure them only through your hosting platform's environment secrets dashboard.

> [!CAUTION]
> Do **not** run `prisma migrate dev`, `prisma db push`, or `prisma migrate reset` against the production database. Only use `npx prisma migrate deploy`.

### 2.3 Configure Backend Environment Secrets

Set the following on your backend hosting platform (not in source files):

```
DATABASE_URL=<Supabase Session Pooler connection string>
DIRECT_URL=<Supabase Direct connection string>
```

The Prisma client uses `DATABASE_URL` at runtime. The migration CLI uses `DIRECT_URL` when it is set.

### 2.4 Apply Database Schema Migrations

Run once after provisioning (or after each deployment that includes new migrations):

```bash
cd server
npx prisma generate
npx prisma migrate deploy
```

`npx prisma migrate deploy` applies all pending migrations from `server/prisma/migrations/` in order. It does **not** reset or modify existing data.

---

## 3. Backend Environment Variables

All variables must be set in the hosting platform's environment secrets dashboard.

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | Supabase Session Pooler connection string (runtime) |
| `DIRECT_URL` | ✅ | Supabase Direct connection string (migrations only) |
| `NODE_ENV` | ✅ | Set to `production` |
| `PORT` | Optional | Server port (defaults to `3001`; some hosts set this automatically) |
| `JWT_ACCESS_SECRET` | ✅ | Min 64 random hex chars — generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `REFRESH_TOKEN_HASH_SECRET` | ✅ | Min 64 random hex chars — generate same way as above |
| `JWT_ACCESS_TTL_SECONDS` | Optional | Access token TTL in seconds (default `900`) |
| `REFRESH_TOKEN_TTL_DAYS` | Optional | Refresh token TTL in days (default `30`) |
| `FRONTEND_URL` | ✅ | Production frontend URL, e.g. `https://shop.example.com` |
| `TRUSTED_ORIGINS` | Optional | Comma-separated extra trusted origins (usually same as `FRONTEND_URL`) |
| `COOKIE_SECURE` | ✅ | Set to `true` in production |
| `COOKIE_SAMESITE` | ✅ | `lax` or `none` — see Cookie section below |
| `RETURN_WINDOW_DAYS` | Optional | Days customers can request a return (default `14`) |

---

## 4. Frontend Environment Variables

Set at **build time** in the static hosting platform's build settings:

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Full backend API URL including prefix: `https://api.example.com/api/v1` |

> [!IMPORTANT]
> `VITE_API_URL` is embedded into the frontend bundle at build time by Vite. If you change the backend URL, you must rebuild and redeploy the frontend.

**Example:**

```bash
# Set in hosting platform build environment variables
VITE_API_URL=https://api.example.com/api/v1
```

---

## 5. Build Commands

### Backend

```bash
cd server
npm ci
npx prisma generate
npm run build
```

**Production start:**

```bash
npm run start:prod
# Runs: node dist/main.js
```

### Frontend

```bash
cd frontend
npm ci
npm run build
# Output: frontend/dist/
```

Deploy the contents of `frontend/dist/` to your static host.

---

## 6. CORS Configuration

The backend allows cross-origin requests from:

1. `http://localhost:5173` and `http://localhost:5174` (always, for local development)
2. The value of `FRONTEND_URL` environment variable
3. Any additional origins in `TRUSTED_ORIGINS` (comma-separated)

**Production configuration example:**

```
FRONTEND_URL=https://shop.example.com
TRUSTED_ORIGINS=https://shop.example.com
```

All mutation requests (`POST`, `PUT`, `PATCH`, `DELETE`) from unknown origins are rejected with `403 Forbidden`. GET/HEAD/OPTIONS requests pass origin validation.

---

## 7. Cookie Configuration

Authentication uses HttpOnly cookies. The correct `SameSite` setting depends on your deployment topology.

### Same-site or Subdomain Topology (recommended)

If frontend and backend share the same root domain:

```
Frontend: https://shop.example.com
Backend:  https://api.example.com
```

```
COOKIE_SECURE=true
COOKIE_SAMESITE=lax
```

### Cross-site Topology

If frontend and backend are on completely different domains (e.g., Vercel + Render):

```
Frontend: https://my-store.vercel.app
Backend:  https://my-api.onrender.com
```

```
COOKIE_SECURE=true
COOKIE_SAMESITE=none
```

> [!WARNING]
> `COOKIE_SAMESITE=none` **requires** `COOKIE_SECURE=true`. Using `none` without `secure` is automatically rejected by all modern browsers. The backend enforces this: if `SameSite=none` is configured, `secure` is always set to `true` regardless of `COOKIE_SECURE`.

> [!NOTE]
> Do not set a cookie `Domain` attribute unless you specifically need cross-subdomain cookie sharing. Omitting the `Domain` attribute is the safe default and lets the browser scope cookies correctly per-origin.

---

## 8. Reverse Proxy / HTTPS Trust

If your backend host terminates HTTPS at a load balancer or reverse proxy (e.g., Render, Railway, most cloud platforms), the backend receives requests over HTTP internally. Secure cookies still work correctly because the proxy forwards the HTTPS connection.

If you encounter issues with `secure` cookies not being sent, add trust-proxy configuration to the NestJS bootstrap in `server/src/main.ts`:

```ts
// Only add if your hosting provider explicitly requires it for secure cookie handling
app.getHttpAdapter().getInstance().set("trust proxy", 1);
```

Check your hosting provider's documentation before adding this setting.

---

## 9. SPA Routing (Frontend)

The frontend is a React Router SPA. Direct navigation to routes like `/products/example`, `/account/orders`, or `/admin/products` requires the host to serve `index.html` for all non-asset paths.

### Netlify / Cloudflare Pages

A `frontend/public/_redirects` file is included:

```
/*    /index.html   200
```

This is automatically picked up by Netlify and Cloudflare Pages.

### Vercel

Create `frontend/vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Nginx

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

### AWS CloudFront

Configure a custom error response: HTTP 403 → `/index.html` with status code `200`.

---

## 10. Health Checks

Two health endpoints are available:

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/health` | Application health — returns `{ status: "ok" }` |
| `GET /api/v1/health/database` | Database connectivity — performs `SELECT 1` |

Configure your hosting platform to use `GET /api/v1/health` as the health check path.

---

## 11. Payment Methods

The platform currently supports:

| Method | Status |
|--------|--------|
| `CASH_ON_DELIVERY` | Production-ready |
| `MOCK_ONLINE` | **Development/demo only** — does not process real payments |

> [!WARNING]
> `MOCK_ONLINE` is a simulated payment method for development testing. It does not connect to any payment gateway and must not be presented to real customers as a real payment option. No real card data should ever be entered or processed.

---

## 12. Initial Admin Account

The application requires at least one ADMIN user to access the admin dashboard.

> [!IMPORTANT]
> Do **not** rely on seed data for production admin accounts. The seed script is for local development only.

To create an initial production admin:

1. Register a regular customer account via the API or storefront.
2. Update the user's `role` field to `ADMIN` directly in the Supabase Table Editor or via a Prisma Studio session connected to your production database:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'admin@example.com';
```

3. The account can then log into `/admin`.
4. Subsequent admin accounts can be created from the Admin → Staff panel.

---

## 13. Database Backups

Supabase provides automatic daily backups on paid plans. Additionally:

- Enable **Point-in-Time Recovery (PITR)** on Supabase Pro plan for fine-grained restore capability.
- For manual backups, use `pg_dump` with the direct connection string.
- Retain daily backups for 30 days and monthly backups for 1 year.

---

## 14. Rollback Procedure

1. Revert the backend deployment to the previous image/commit on your hosting platform.
2. If the deployment included new migrations, manually roll back the affected migration rows in `_prisma_migrations` and run reverse SQL if needed.
3. Revert the frontend deployment on the static host.

> [!CAUTION]
> Prisma does not support automatic migration rollback. Plan schema changes carefully and test migrations on a staging database before applying to production.

---

## 15. Production Smoke Test Checklist

After deploying, verify the following manually:

### Public Storefront
- [ ] Homepage loads
- [ ] Categories and brands load
- [ ] Products load with filters
- [ ] Product detail page with variants
- [ ] Variant stock shows correctly (no hardcoded values)
- [ ] Product reviews visible

### Authentication
- [ ] Register new account
- [ ] Login
- [ ] Browser refresh remains logged in (refresh cookie works)
- [ ] Logout clears session
- [ ] Auth cookies show as `HttpOnly` in browser DevTools → Application → Cookies
- [ ] Auth cookies show `Secure` flag when served over HTTPS

### Customer
- [ ] Add to cart
- [ ] Update cart quantity
- [ ] Wishlist add/remove
- [ ] Add address
- [ ] Checkout preview
- [ ] Place COD order
- [ ] Order history visible
- [ ] Order tracking works (public + authenticated)

### Admin
- [ ] Admin login
- [ ] Dashboard summary loads
- [ ] Create product + set initial stock
- [ ] Edit product
- [ ] Adjust inventory via Adjust Stock
- [ ] Orders list loads
- [ ] Update order status
- [ ] Review moderation
- [ ] Returns management
- [ ] Customers list
- [ ] Staff management
- [ ] Reports load
- [ ] Audit logs load

### Security
- [ ] Unauthenticated request to `/api/v1/cart` returns 401
- [ ] CUSTOMER-role token rejected by admin endpoints (403)
- [ ] No CORS errors in browser console
- [ ] No `http://localhost` API calls visible in browser DevTools → Network
- [ ] Health endpoint returns `{ "status": "ok" }`
- [ ] Database health endpoint returns `{ "database": true }`

---

## 16. Pre-Flight Checklist

- [ ] `DATABASE_URL` set to Supabase Session Pooler connection string
- [ ] `DIRECT_URL` set to Supabase Direct connection string
- [ ] `npx prisma migrate deploy` completed successfully
- [ ] `JWT_ACCESS_SECRET` is at least 64 random hex characters
- [ ] `REFRESH_TOKEN_HASH_SECRET` is at least 64 random hex characters
- [ ] `COOKIE_SECURE=true`
- [ ] `COOKIE_SAMESITE` matches deployment topology (`lax` or `none`)
- [ ] `FRONTEND_URL` set to production frontend URL
- [ ] `VITE_API_URL` set to production backend URL at frontend build time
- [ ] HTTPS active on both frontend and backend domains
- [ ] Initial admin account created
- [ ] Health endpoint accessible
- [ ] No secrets committed to source control
