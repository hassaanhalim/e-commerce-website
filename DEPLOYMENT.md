# Deployment & Production Operations Guide

This guide details deployment procedures, environment configuration, database migrations, security guidelines, and maintenance operations for the Shoe Store platform.

---

## 1. Deployment Architecture

The application is structured as a monorepo containing two decoupled applications:

```
shoe-store/
├── frontend/   # Static React SPA (Built with Vite)
└── server/     # Node.js + NestJS API Application
```

### Recommended Hosting Topology

| Component | Target Provider Type | Example Providers |
| :--- | :--- | :--- |
| **Frontend** | Static Site / CDN Hosting | Vercel, Netlify, Cloudflare Pages, AWS CloudFront |
| **Backend** | Container / Node.js Application Host | Railway, Render, Fly.io, AWS ECS, VPS |
| **Database** | Managed PostgreSQL Instance | Supabase, Neon, AWS RDS, Railway Postgres |

---

## 2. Environment Variables Checklist

### Backend Configuration (`server/.env`)
Must be configured in host environment settings:
- `DATABASE_URL`: Production PostgreSQL connection string (must include `?schema=public`).
- `PORT`: Server listening port (default `3001` or set by host).
- `NODE_ENV`: Set to `production`.
- `FRONTEND_URL`: Production frontend URL (e.g. `https://shoestore.example.com`).
- `TRUSTED_ORIGINS`: Comma-separated list of allowed origins.
- `JWT_ACCESS_SECRET`: Cryptographically strong random string (min 64 hex characters).
- `REFRESH_TOKEN_HASH_SECRET`: Cryptographically strong random string (min 64 hex characters).
- `JWT_ACCESS_TTL_SECONDS`: `900` (15 minutes).
- `REFRESH_TOKEN_TTL_DAYS`: `30` (30 days).
- `COOKIE_SECURE`: `true` (Enforces HTTPS-only cookies).
- `COOKIE_SAMESITE`: `lax` (Recommended for same-domain or subdomain setups) or `none` (if cross-site).
- `RETURN_WINDOW_DAYS`: `14`.

### Frontend Configuration (`frontend/.env`)
Must be configured at build time:
- `VITE_API_URL`: Production API endpoint (e.g. `https://api.shoestore.example.com/api/v1`).

---

## 3. Production Deployment Step-by-Step

### A. Database Provisioning & Migrations
1. Provision managed PostgreSQL database.
2. Retrieve production `DATABASE_URL`.
3. Apply schema migrations via Prisma migration deploy:
```bash
cd server
npx prisma generate
npx prisma migrate deploy
```

> [!WARNING]
> **Do NOT run `prisma migrate dev` or `prisma db push` in production.** Always run `npx prisma migrate deploy` to execute compiled migration SQL files safely.

### B. Backend Deployment
1. Set all environment variables on backend host.
2. Install production dependencies and build:
```bash
cd server
npm ci
npx prisma generate
npm run build
```
3. Start production server:
```bash
npm run start:prod
```
4. Verify backend health check:
`GET https://api.shoestore.example.com/api/v1/health`

### C. Frontend Deployment
1. Set `VITE_API_URL` build variable on static host.
2. Build static production assets:
```bash
cd frontend
npm ci
npm run build
```
3. Deploy output folder `frontend/dist`.

---

## 4. Security & Cookie Guidelines

1. **HTTPS Enforcement**: In production (`NODE_ENV=production`), set `COOKIE_SECURE=true`. HttpOnly cookies will be transmitted exclusively over HTTPS.
2. **CORS Security**: Cross-Origin Resource Sharing is configured dynamically based on `FRONTEND_URL` and `TRUSTED_ORIGINS`. Wildcard origins (`*`) are prohibited. `credentials: true` must remain enabled.
3. **Request Origin Protection**: Unsafe HTTP methods (`POST`, `PUT`, `PATCH`, `DELETE`) require a matching `Origin` header matching trusted origins.
4. **Rate Limiting**: Automated login, registration, and session refresh endpoints are rate-limited per IP bucket to mitigate brute-force attacks.

---

## 5. Maintenance, Backups & Rollback

### Database Backup Strategy
- Schedule daily automated PostgreSQL database dumps (`pg_dump`).
- Retain daily backups for 30 days and monthly backups for 1 year.

### Rollback Procedure
1. Revert backend deployment to previous container image or commit hash.
2. If database schema was altered, run a reverse Prisma migration migration script if needed.
3. Revert frontend deployment on CDN host.

---

## 6. Pre-Flight Production Checklist

- [ ] All database migrations applied via `npx prisma migrate deploy`
- [ ] Backend health endpoints returning `status: "ok"`
- [ ] Production secrets set for `JWT_ACCESS_SECRET` and `REFRESH_TOKEN_HASH_SECRET`
- [ ] `COOKIE_SECURE=true` set in production environment
- [ ] `FRONTEND_URL` matches deployed production site URL
- [ ] HTTPS active on both frontend and backend domains
- [ ] Initial administrator account created and password changed from default
- [ ] Temporary verification scripts removed
