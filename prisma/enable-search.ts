import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS product_name_trgm_idx ON "Product" USING gin (name gin_trgm_ops);`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS brand_name_trgm_idx ON "Brand" USING gin (name gin_trgm_ops);`
  );
  console.log("Listo: busqueda tolerante a errores habilitada.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
