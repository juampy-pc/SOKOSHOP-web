import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const brand = await prisma.brand.upsert({
    where: { slug: "prueba" },
    update: {},
    create: { slug: "prueba", name: "Prueba", origin: "independiente" },
  });

  const product = await prisma.product.upsert({
    where: { slug: "producto-de-prueba" },
    update: {},
    create: {
      slug: "producto-de-prueba",
      brandId: brand.id,
      name: "Producto de prueba — NO VENDER",
      status: "activo",
      notesStructure: "sin_datos",
    },
  });

  const existing = await prisma.productVariant.findFirst({
    where: { productId: product.id },
  });

  if (!existing) {
    await prisma.productVariant.create({
      data: {
        productId: product.id,
        type: "frasco_completo",
        price: 1,
        stock: 999,
      },
    });
  }

  console.log("Listo. Producto de prueba en: /marcas/prueba/producto-de-prueba");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
