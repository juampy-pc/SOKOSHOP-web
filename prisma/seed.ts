import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

type SeedData = {
  brands: { slug: string; name: string; origin: string }[];
  products: {
    slug: string;
    brandSlug: string;
    name: string;
    decantAvailable: boolean;
    notesStructure: string;
    status: string;
  }[];
  variants: {
    productSlug: string;
    type: string;
    sizeMl: number | null;
    price: number;
    stock: number | null;
    skuInternal: string | null;
    gtin: string | null;
    costInclTax: number | null;
    marginPct: number | null;
  }[];
};

async function main() {
  const raw = fs.readFileSync(path.join(__dirname, "seed-data.json"), "utf-8");
  const data: SeedData = JSON.parse(raw);

  console.log("Limpiando datos anteriores...");
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.brand.deleteMany();

  console.log(`Cargando ${data.brands.length} marcas...`);
  for (const b of data.brands) {
    await prisma.brand.create({ data: b });
  }

  console.log(`Cargando ${data.products.length} productos...`);
  for (const p of data.products) {
    await prisma.product.create({
      data: {
        slug: p.slug,
        name: p.name,
        decantAvailable: p.decantAvailable,
        notesStructure: p.notesStructure,
        status: p.status,
        brand: { connect: { slug: p.brandSlug } },
      },
    });
  }

  console.log(`Cargando ${data.variants.length} variantes...`);
  for (const v of data.variants) {
    await prisma.productVariant.create({
      data: {
        type: v.type,
        sizeMl: v.sizeMl ?? undefined,
        price: v.price,
        stock: v.stock ?? undefined,
        skuInternal: v.skuInternal ?? undefined,
        gtin: v.gtin ?? undefined,
        costInclTax: v.costInclTax ?? undefined,
        marginPct: v.marginPct ?? undefined,
        product: { connect: { slug: v.productSlug } },
      },
    });
  }

  console.log("¡Listo!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
