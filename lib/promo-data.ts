// Carga de promociones y regalos desde la base para el motor (lib/promo-engine).
// Equivalente a sokoshop-admin/lib/promo-data.ts (allá lo usa el POS).
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { cleanProductName } from "@/lib/format";
import type { EngineItem, EnginePromo, GiftVariant } from "@/lib/promo-engine";

export const TYPE_LABEL: Record<string, string> = { decant: "Decant", frasco_completo: "Frasco completo", body_splash: "Body Splash" };
export const variantLabel = (v: { type: string; sizeMl: number | null }) => `${TYPE_LABEL[v.type] ?? v.type}${v.sizeMl ? ` ${v.sizeMl}ml` : ""}`;

export function activePromoWhere(now = new Date()): Prisma.PromotionWhereInput {
  return {
    active: true,
    archivedAt: null,
    AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
  };
}

type GiftRow = { id: string; productId: string; type: string; sizeMl: number | null; price: number; salePrice: number | null; stock: number | null; product: { name: string; status: string; brand: { name: string } } };
const toGift = (v: GiftRow): GiftVariant => ({
  variantId: v.id,
  productId: v.productId,
  label: variantLabel(v),
  productName: cleanProductName(v.product.name, v.product.brand.name),
  brandName: v.product.brand.name,
  price: v.salePrice && v.salePrice > 0 && v.salePrice < v.price ? v.salePrice : v.price,
  stock: v.stock,
  sizeMl: v.sizeMl,
});

/** Regalos posibles para estas promos y estos ítems (variantes fijas y decants de los productos del carrito). */
export async function loadGifts(promos: EnginePromo[], items: EngineItem[]) {
  const ids = promos.map((p) => p.giftVariantId).filter((x): x is string => Boolean(x));
  const needDecants = promos.some((p) => p.kind === "regalo" && p.giftMode === "decant_del_producto");
  const include = { product: { include: { brand: true } } } as const;
  const [fixed, decants] = await Promise.all([
    ids.length ? prisma.productVariant.findMany({ where: { id: { in: ids }, product: { status: { not: "archivado" } } }, include }) : Promise.resolve([]),
    needDecants ? prisma.productVariant.findMany({ where: { productId: { in: items.map((i) => i.productId) }, type: "decant" }, include }) : Promise.resolve([]),
  ]);
  const giftVariants = new Map(fixed.map((v) => [v.id, toGift(v)]));
  const decantsByProduct = new Map<string, GiftVariant[]>();
  for (const d of decants) decantsByProduct.set(d.productId, [...(decantsByProduct.get(d.productId) ?? []), toGift(d)]);
  return { giftVariants, decantsByProduct };
}

/** Promos que ya usó este mail (pedidos pagados). */
export async function promosUsedBy(email: string | null) {
  if (!email) return new Set<string>();
  const rows = await prisma.order.findMany({
    where: {
      promotionId: { not: null },
      status: { in: ["pagado", "pagado_revisar_stock", "entregado", "revisar_monto"] },
      customerEmail: { equals: email, mode: "insensitive" },
    },
    select: { promotionId: true },
  });
  return new Set(rows.map((r) => r.promotionId!));
}
