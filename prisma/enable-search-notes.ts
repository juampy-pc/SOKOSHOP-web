import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS note_name_trgm_idx ON "Note" USING gin (name gin_trgm_ops);`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS product_family_trgm_idx ON "Product" USING gin ("olfactiveFamily" gin_trgm_ops);`
  );
  console.log("Listo.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
