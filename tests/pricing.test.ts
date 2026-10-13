// Test de integración de la cotización del carrito contra una base de prueba (NUNCA producción).
// Uso: DATABASE_URL=postgresql://.../base_de_prueba npx tsx --test tests/pricing.test.ts
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import { quote } from "../lib/pricing";
import { promoPrice, salePct } from "../lib/catalog";
import { salePromos } from "../lib/sale-promos";

if (/neon\.tech/.test(process.env.DATABASE_URL ?? "") && !process.env.ALLOW_NEON_TEST) {
  throw new Error("Este test escribe datos: usar una base local o un branch de Neon con ALLOW_NEON_TEST=1");
}
const created: string[] = [];
after(async () => {
  await prisma.order.deleteMany({ where: { promotionId: { in: created } } });
  await prisma.promotion.deleteMany({ where: { id: { in: created } } });
  await prisma.$disconnect();
});

async function twoBrands() {
  const vs = await prisma.productVariant.findMany({ where: { archivedAt: null, stock: null, product: { status: "publicado" } }, include: { product: { include: { brand: true } } }, take: 200 });
  const a = vs[0];
  const b = vs.find((v) => v.product.brandId !== a.product.brandId)!;
  return { a, b };
}

test("con dos promos de precio tachado que se pisan, el carrito cobra lo que muestran las tarjetas", async () => {
  await prisma.promotion.updateMany({ where: { active: true }, data: { active: false } }); // base de prueba: solo las de este test
  const { a, b } = await twoBrands();
  const all = await prisma.promotion.create({ data: { name: "10% todo", kind: "porcentaje", value: 10, showAsSale: true, active: true } });
  const brand = await prisma.promotion.create({ data: { name: "20% marca", kind: "porcentaje", value: 20, showAsSale: true, active: true, brandId: a.product.brandId } });
  created.push(all.id, brand.id);
  const sales = await salePromos();
  const shown = [a, b].map((v) => promoPrice(v, salePct(sales, { id: v.productId, brandId: v.product.brandId, origin: v.product.brand.origin })).price);
  const q = await quote({ lines: [{ variantId: a.id, qty: 1 }, { variantId: b.id, qty: 1 }] });
  assert.equal(q.total, shown[0] + shown[1]);
  assert.equal(q.discount, 0);
});

test("un cupón de 1 uso queda reservado mientras otro cliente lo está pagando", async () => {
  await prisma.promotion.updateMany({ where: { active: true }, data: { active: false } });
  const { a } = await twoBrands();
  const promo = await prisma.promotion.create({ data: { name: "cupón", code: "UNOSOLO", kind: "monto", value: 1000, maxUses: 1, active: true } });
  created.push(promo.id);
  const first = await quote({ lines: [{ variantId: a.id, qty: 1 }], couponCode: "UNOSOLO", email: "uno@test.com" });
  assert.equal(first.couponError, null);
  await prisma.order.create({ data: { total: first.total, promotionId: promo.id, customerEmail: "uno@test.com", status: "pendiente" } });
  const other = await quote({ lines: [{ variantId: a.id, qty: 1 }], couponCode: "UNOSOLO", email: "dos@test.com" });
  assert.match(other.couponError ?? "", /máximo/);
  // El mismo cliente que reintenta el pago no se bloquea a sí mismo.
  const again = await quote({ lines: [{ variantId: a.id, qty: 1 }], couponCode: "UNOSOLO", email: "uno@test.com" });
  assert.equal(again.couponError, null);
});
