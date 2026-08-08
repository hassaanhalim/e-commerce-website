# E-Commerce Website — Shoe Store

A full-stack e-commerce application for browsing, purchasing, managing, and tracking footwear products.

The application includes a customer storefront, authenticated customer accounts, inventory-aware checkout, order management, reviews, returns and exchanges, and a complete administration panel.

---

## Features

### Customer Store

- Browse products
- Search and filtering
- Categories and brands
- Product variants by size and color
- Multiple product images
- Real-time stock availability
- Product reviews and ratings
- Guest and authenticated cart
- Wishlist
- Customer addresses
- Checkout
- Cash on Delivery
- Order history
- Order tracking
- Returns and exchanges

### Inventory

- Variant-level stock management
- Stock adjustments
- Reserved stock during checkout
- Available-stock calculation
- Low-stock monitoring
- Inventory adjustment history
- Transaction-safe stock updates

### Orders

- Checkout sessions
- Inventory reservation
- Order creation
- Order-status tracking
- Customer cancellation
- Admin order management
- Payment-status management
- Public order tracking

### Reviews and Returns

- Verified-purchase reviews
- Review moderation
- Product rating calculations
- Return requests
- Exchange requests
- Replacement-stock reservation
- Refund calculations
- Admin return and exchange management

### Administration

- Dashboard
- Product management
- Category management
- Brand management
- Inventory management
- Order management
- Customer management
- Staff management
- Review moderation
- Return and exchange management
- Reports
- Audit logs

---

## Technology Stack

### Frontend

- React
- Vite
- TypeScript
- Tailwind CSS
- React Router
- Context API

### Backend

- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT authentication
- HttpOnly cookies
- Passport
- class-validator
- Swagger

---

## Project Structure

```text
e-commerce-website/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── types/
│   │   └── utils/
│   │
│   ├── .env.example
│   ├── package.json
│   └── vite.config.ts
│
├── server/
│   ├── prisma/
│   │   ├── migrations/
│   │   └── schema.prisma
│   │
│   ├── src/
│   │   ├── addresses/
│   │   ├── admin/
│   │   ├── audit/
│   │   ├── auth/
│   │   ├── cart/
│   │   ├── catalog/
│   │   ├── checkout/
│   │   ├── health/
│   │   ├── orders/
│   │   ├── returns/
│   │   ├── reviews/
│   │   ├── security/
│   │   └── wishlist/
│   │
│   ├── .env.example
│   └── package.json
│
├── .gitignore
├── README.md
└── DEPLOYMENT.md