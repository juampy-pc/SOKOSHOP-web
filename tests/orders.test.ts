// Test de integración de markPaid contra una base de prueba (NUNCA producción).
// Uso: DATABASE_URL=postgresql://.../base_de_prueba npx tsx --test tests/orders.test.ts
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import { markPaid } from "../lib/orders";

if (/neon\.tech/.test(process.env.DATABASE_URL ?? "") && !process.env.ALLOW_NEON_TEST) {
  throw new Error("Este test escribe datos: usar una base local o un branch de Neon con ALLOW_NEON_TEST=1");
}

async function setup(stock: number | null, qty: number) {
  const v = await prisma.productVariant.findFirstOrThrow({ where: { stockMovements: { none: {} } } });
  await prisma.productVariant.update({ where: { id: v.id }, data: { stock } });
  const order = await prisma.order.create({
    data: {
      total: v.price * qty,
      items: { create: { productVariantId: v.id, productName: "test", variantLabel: "test", price: v.price, quantity: qty } },
    },
  });
  return { v, order, restore: () => prisma.productVariant.update({ where: { id: v.id }, data: { stock: v.stock } }) };
}

after(() => prisma.$disconnect());

test("10 notificaciones concurrentes del mismo pago descuentan una sola vez", async () => {
  const { v, order, restore } = await setup(5, 2);
  await Promise.all(Array.from({ length: 10 }, () => markPaid(order.id, "pay-1", order.total, "ARS").catch(() => {})));
  const after = await prisma.productVariant.findUniqueOrThrow({ where: { id: v.id } });
  const o = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
  const movs = await prisma.stockMovement.findMany({ where: { orderId: order.id } });
  assert.equal(after.stock, 3);
  assert.equal(o.status, "pagado");
  assert.equal(movs.length, 1);
  assert.equal(movs[0].quantity, -2);
  assert.equal(movs[0].stockAfter, 3);
  await restore();
});

test("dos pedidos por la última unidad: uno se descuenta, el otro queda a revisar", async () => {
  const { v, order, restore } = await setup(1, 1);
  const order2 = await prisma.order.create({
    data: { total: order.total, items: { create: { productVariantId: v.id, productName: "t", variantLabel: "t", price: v.price, quantity: 1 } } },
  });
  await Promise.all([markPaid(order.id, "p-a", order.total, "ARS"), markPaid(order2.id, "p-b", order.total, "ARS")]);
  const stock = (await prisma.productVariant.findUniqueOrThrow({ where: { id: v.id } })).stock;
  const statuses = (await prisma.order.findMany({ where: { id: { in: [order.id, order2.id] } } })).map((o) => o.status).sort();
  assert.equal(stock, 0, "nunca negativo");
  assert.deepEqual(statuses, ["pagado", "pagado_revisar_stock"]);
  await restore();
});

test("monto distinto al de la orden: no toca stock", async () => {
  const { v, order, restore } = await setup(4, 1);
  await markPaid(order.id, "p-x", order.total - 1, "ARS");
  assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { id: v.id } })).stock, 4);
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status, "revisar_monto");
  await restore();
});

test("stock null (no controlado): se marca pagado sin movimiento", async () => {
  const { v, order, restore } = await setup(null, 3);
  await markPaid(order.id, "p-n", order.total, "ARS");
  assert.equal((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status, "pagado");
  assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { id: v.id } })).stock, null);
  await restore();
});

test("decants pagados online descuentan ml del frasco para decants (si se controla)", async () => {
  const v = await prisma.productVariant.findFirstOrThrow({ where: { type: "decant", sizeMl: 5, archivedAt: null } });
  const p = await prisma.product.findUniqueOrThrow({ where: { id: v.productId } });
  await prisma.product.update({ where: { id: p.id }, data: { decantMl: 50 } });
  const order = await prisma.order.create({
    data: { total: v.price * 2, items: { create: { productVariantId: v.id, productName: "test", variantLabel: "Decant 5 ml", price: v.price, quantity: 2 } } },
  });
  await markPaid(order.id, "pay-decant", order.total, "ARS");
  const after = await prisma.product.findUniqueOrThrow({ where: { id: p.id } });
  const move = await prisma.decantMove.findFirst({ where: { orderId: order.id, type: "venta_online" } });
  await prisma.product.update({ where: { id: p.id }, data: { decantMl: p.decantMl } });
  assert.equal(after.decantMl, 40);
  assert.equal(move?.ml, -10);
});
