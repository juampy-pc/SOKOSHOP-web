// Promos automáticas con "precio tachado" (las que se ven en las tarjetas y en la ficha).
import { prisma } from "@/lib/prisma";
import { activePromoWhere } from "@/lib/promo-data";
import type { SalePromo } from "@/lib/catalog";

/** Solo % automáticas sin condiciones: el precio que se muestra es el que se paga (el checkout usa la misma regla). */
export const isSalePromo = (p: { showAsSale: boolean; kind: string; code: string | null; minSubtotal: number | null; onePerCustomer: boolean; maxUses: number | null }) =>
  p.showAsSale && p.kind === "porcentaje" && !p.code && !p.minSubtotal && !p.onePerCustomer && p.maxUses === null;

export async function salePromos(): Promise<SalePromo[]> {
  return prisma.promotion.findMany({
    where: { ...activePromoWhere(), showAsSale: true, kind: "porcentaje", code: null, minSubtotal: null, onePerCustomer: false, maxUses: null },
    select: { value: true, brandId: true, origin: true, productIds: true },
  });
}
