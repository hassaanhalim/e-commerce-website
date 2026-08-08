import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

type UserRow = {
  id: string;
  password: string;
};

async function main() {
  const usersToBackfill = await prisma.$queryRaw<UserRow[]>`
    SELECT id, password
    FROM "User"
    WHERE "passwordHash" IS NULL
    ORDER BY id ASC
  `;

  let updatedCount = 0;

  for (const user of usersToBackfill) {
    const passwordHash = await argon2.hash(user.password, {
      type: argon2.argon2id,
    });

    await prisma.$executeRaw`
      UPDATE "User"
      SET "passwordHash" = ${passwordHash},
          "updatedAt" = NOW()
      WHERE id = ${user.id}
        AND "passwordHash" IS NULL
    `;

    updatedCount += 1;
  }

  const remaining = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM "User"
    WHERE "passwordHash" IS NULL
  `;

  if (remaining[0]?.count !== 0n) {
    throw new Error(`Backfill incomplete: ${remaining[0]?.count.toString() ?? "unknown"} users still have null passwordHash.`);
  }

  console.log(`Backfilled ${updatedCount} user(s).`);
}

main()
  .catch((error) => {
    console.error("Password hash backfill failed.");
    process.exitCode = 1;
    throw error;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });