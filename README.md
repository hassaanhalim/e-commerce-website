# Shoe Store — E-Commerce Application

A full-stack e-commerce shoe store web application built with React, Vite, NestJS, Prisma ORM, and PostgreSQL.

---

## 1. Project Overview

The Shoe Store platform provides a modern, end-to-end shopping experience featuring:
- **Product Catalog**: Categories, brands, search, filtering, pagination, and multi-variant stock availability.
- **Inventory Management**: Real-time stock reservation, low-stock alerts, and transactional stock history.
- **Cart & Wishlist**: Session-persistent guest cart/wishlist with automatic user merge upon login.
- **Checkout & Orders**: Stock reservation, Cash on Delivery (COD), mock online payment simulation, and order tracking.
- **Post-Purchase Operations**: Verified-buyer reviews, return/exchange request processing, and refund workflows.
- **Admin Operations**: Analytics dashboard, audit logging, sales/inventory/customer reports, staff management, and role-based authorization.

---

## 2. Directory Structure

```
shoe-store/
├── frontend/                     # React + Vite frontend application
│   ├── src/
│   │   ├── components/          # Reusable UI, layout & admin components
│   │   ├── context/             # AuthContext, CartContext, WishlistContext
│   │   ├── pages/               # Public, Customer Account, and Admin pages
│   │   ├── services/            # Fetch-based API client services
│   │   ├── types/               # TypeScript type definitions
│   │   └── utils/               # Formatter & helper utilities
│   ├── .env.example
│   └── vite.config.ts
├── server/                       # NestJS backend application
│   ├── src/
│   │   ├── addresses/           # Customer shipping address module
│   │   ├── admin/               # Admin dashboard, staff, customers & reports
│   │   ├── audit/               # Audit log module
│   │   ├── auth/                # JWT + HttpOnly cookie authentication
│   │   ├── cart/                # Backend cart module
│   │   ├── catalog/             # Public & Admin catalog module
│   │   ├── checkout/            # Checkout preview & stock reservation session module
│   │   ├── health/              # Health & database connectivity module
│   │   ├── orders/              # Orders, payment & tracking module
│   │   ├── returns/             # Returns & exchanges module
│   │   ├── reviews/             # Product reviews & moderation module
│   │   ├── security/            # Request safety & origin validation middleware
│   │   └── wishlist/            # Customer wishlist module
│   ├── prisma/
│   │   ├── migrations/          # Applied PostgreSQL database migrations
│   │   └── schema.prisma        # Prisma ORM data schema definition
│   └── .env.example
├── DEPLOYMENT.md                 # Production deployment & operations guide
└── README.md                     # Root project documentation
```

---

## 3. Technology Stack

- **Frontend**: React 18+, Vite, TypeScript, Tailwind CSS, React Router v7
- **Backend**: NestJS, TypeScript, Prisma ORM, PostgreSQL, Passport JWT, Swagger
- **Authentication**: Access + Refresh Tokens in HttpOnly SameSite Cookies
- **Validation**: `class-validator`, `class-transformer` with global ValidationPipe

---

## 4. Local Development Setup

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL database server (v14 or higher)

### Step 1: Database Configuration
Ensure PostgreSQL is running locally and create a database named `shoe_store`.

### Step 2: Backend Setup
```bash
cd server
cp .env.example .env
# Update DATABASE_URL, JWT_ACCESS_SECRET, and REFRESH_TOKEN_HASH_SECRET in server/.env

npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev
```
Backend API server will run at: `http://localhost:3001/api/v1`
Swagger API Documentation: `http://localhost:3001/api/docs`

### Step 3: Frontend Setup
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```
Frontend development server will run at: `http://localhost:5173`

---

## 5. Environment Variables

### Backend (`server/.env`)
| Variable | Description | Example |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/shoe_store` |
| `PORT` | API server listening port | `3001` |
| `NODE_ENV` | Environment mode | `development` / `production` |
| `FRONTEND_URL` | Trusted primary frontend URL | `http://localhost:5173` |
| `TRUSTED_ORIGINS` | Comma-separated CORS origins | `http://localhost:5173,http://localhost:5174` |
| `JWT_ACCESS_SECRET` | Secret key for JWT access tokens | `your_access_token_secret` |
| `REFRESH_TOKEN_HASH_SECRET` | Secret key for refresh token hashes | `your_refresh_hash_secret` |
| `JWT_ACCESS_TTL_SECONDS` | Access token lifespan (seconds) | `900` |
| `REFRESH_TOKEN_TTL_DAYS` | Refresh token lifespan (days) | `30` |
| `COOKIE_SECURE` | HttpOnly cookie secure flag | `false` (dev) / `true` (prod) |
| `COOKIE_SAMESITE` | Cookie SameSite strategy | `lax` / `strict` / `none` |
| `RETURN_WINDOW_DAYS` | Return eligibility window | `14` |

### Frontend (`frontend/.env`)
| Variable | Description | Example |
| :--- | :--- | :--- |
| `VITE_API_URL` | Full backend API base URL | `http://localhost:3001/api/v1` |

---

## 6. Known Development-Only Limitations

> [!IMPORTANT]
> **Mock Online Payment Gateway**: The `MOCK_ONLINE` payment method is a development simulation endpoint used to verify order payment transitions. No real credit card or payment gateway integration is present. **Do not enter real payment card data.** Before deploying to production for real online payments, integrate a payment gateway (e.g. Stripe, PayPal).

---

## 7. Operational & Build Commands

- **Run Backend Production Build**: `npm run build` (inside `server`)
- **Start Backend Production Server**: `npm run start:prod` (inside `server`)
- **Run Frontend Production Build**: `npm run build` (inside `frontend`)
- **Health Check Endpoint**: `GET /api/v1/health` and `GET /api/v1/health/database`
