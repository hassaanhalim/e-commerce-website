import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",

  // Route all Prisma CLI operations (migrate deploy, migrate dev, db pull, etc.)
  // through DIRECT_URL so they bypass any connection pooler (Supabase Supavisor).
  // In local development DIRECT_URL equals DATABASE_URL (no pooler present).
  engine: "classic",
  datasource: {
    url: env("DIRECT_URL"),
  },

  migrations: {
    path: "prisma/migrations",
    seed: "ts-node --transpile-only prisma/seed.ts",
  },
});
