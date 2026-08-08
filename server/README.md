# Shoe Store Backend

NestJS + Prisma backend for the shoe-store frontend.

## Local setup

1. Start PostgreSQL:

```bash
docker compose up -d
```

2. Install dependencies:

```bash
npm install
```

3. Generate Prisma client:

```bash
npx prisma generate
```

4. Run the server:

```bash
npm run start:dev
```

## Environment

Copy `.env.example` to `.env` and adjust `DATABASE_URL` if your PostgreSQL credentials differ.