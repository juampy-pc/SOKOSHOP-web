// Cotización del carrito del lado del servidor: precios, promociones/cupón y envío.
// El navegador solo manda variantes y cantidades; todo lo demás se calcula acá.
import { prisma } from "@/lib/prisma";
import { cleanProductName } from "@/lib/format";
import { effectivePrice } from "@/lib/catalog";

export const MAX_QTY_PER_ITEM = 10;
export const MAX_LINES = 30;

const typeLabel: Record<string, string> = { decant: "Decant", frasco_completo: "Frasco completo", body_splash: "Body Splash" };

export type CartLine = { variantId: string; qty: number };
export type QuoteInput = { lines: CartLine[]; couponCode?: string | null; deliveryMethod?: "envio" | "retiro" | null; zoneId?: string | null };

export class QuoteError extends Error {}

export function parseLines(items: unknown): CartLine[] | null {
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_LINES) return null;
  const merged = new Map<string, number>();
  for (const raw of items) {
    const variantId = (raw as { variantId?: unknown })?.variantId;
    const qty = (raw as { qty?: unknown })?.qty;
    if (typeof variantId !== "string" || variantId.length === 0 || variantId.length > 64) return null;
    if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1) return null;
    merged.set(variantId, (merged.get(variantId) ?? 0) + qty);
  }
  for (const qty of merged.values()) if (qty > MAX_QTY_PER_ITEM) return null;
  return [...merged].map(([variantId, qty]) => ({ variantId, qty }));
}

type Promo = { id: string; name: string; code: string | null; kind: string; value: number; minSubtotal: number | null; brandId: string | null; origin: string | null; maxUses: number | null; usedCount: number };

export async function quote(input: QuoteInput) {
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: input.lines.map((l) => l.variantId) } },
    include: { product: { include: { brand: true } } },
  });
  const byId = new Map(variants.map((v) => [v.id, v]));

  const items = input.lines.map((l) => {
    const v = byId.get(l.variantId);
    if (!v || v.product.status !== "publicado") throw new QuoteError("Un producto del carrito ya no está disponible.");
    const productName = cleanProductName(v.product.name, v.product.brand.name);
    if (v.stock !== null && v.stock < l.qty) throw new QuoteError(v.stock <= 0 ? `${productName} se agotó.` : `De ${productName} quedan ${v.stock}.`);
    return {
      variantId: v.id,
      brandId: v.product.brandId,
      origin: v.product.brand.origin,
      brandName: v.product.brand.name,
      productName,
      variantLabel: `${typeLabel[v.type] ?? v.type}${v.sizeMl ? ` ${v.sizeMl}ml` : ""}`,
      price: effectivePrice(v),
      qty: l.qty,
    };
  });
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);

  // Envío
  const zones = await prisma.shippingZone.findMany({ where: { active: true }, orderBy: [{ sort: "asc" }, { name: "asc" }] });
  const method = input.deliveryMethod ?? null;
  const zone = method === "envio" ? zones.find((z) => z.id === input.zoneId) ?? null : null;
  if (method === "envio" && input.zoneId && !zone) throw new QuoteError("La zona de envío ya no está disponible.");

  // Promociones vigentes (automáticas) + cupón ingresado
  const now = new Date();
  const code = input.couponCode?.trim().toUpperCase() || null;
  const active = await prisma.promotion.findMany({
    where: {
      active: true,
      AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      OR: [{ code: null }, ...(code ? [{ code }] : [])],
    },
  });
  const usable = (p: Promo) => p.maxUses === null || p.usedCount < p.maxUses;
  let couponError: string | null = null;
  if (code) {
    const c = active.find((p) => p.code === code);
    const exists = c ?? (await prisma.promotion.findUnique({ where: { code } }));
    if (!exists) couponError = "El cupón no existe.";
    else if (!c) couponError = "El cupón no está vigente.";
    else if (!usable(c)) couponError = "El cupón ya se usó el máximo de veces.";
  }

  const evaluate = (p: Promo) => {
    const eligible = items.filter((i) => (!p.brandId || i.brandId === p.brandId) && (!p.origin || i.origin === p.origin));
    const base = eligible.reduce((s, i) => s + i.price * i.qty, 0);
    if (base === 0) return { ok: false as const, reason: "El cupón no aplica a los productos del carrito." };
    if (p.minSubtotal && base < p.minSubtotal) return { ok: false as const, reason: `El cupón requiere una compra mínima de $${p.minSubtotal.toLocaleString("es-AR")}.` };
    const discount = p.kind === "porcentaje" ? Math.round((base * Math.min(90, p.value)) / 100) : p.kind === "monto" ? Math.min(base, p.value) : 0;
    return { ok: true as const, discount, freeShipping: p.kind === "envio_gratis" };
  };

  const shippingFor = (discount: number, free: boolean) => {
    if (method !== "envio" || !zone) return 0;
    if (free) return 0;
    if (zone.freeFrom && subtotal - discount >= zone.freeFrom) return 0;
    return zone.price;
  };

  let best: { promo: Promo; discount: number; freeShipping: boolean } | null = null;
  for (const p of active.filter(usable)) {
    const r = evaluate(p);
    if (!r.ok) {
      if (p.code === code && !couponError) couponError = r.reason;
      continue;
    }
    const benefit = r.discount + (shippingFor(0, false) - shippingFor(r.discount, r.freeShipping));
    const bestBenefit = best ? best.discount + (shippingFor(0, false) - shippingFor(best.discount, best.freeShipping)) : -1;
    if (benefit > bestBenefit || (benefit === bestBenefit && p.code && p.code === code)) best = { promo: p, discount: r.discount, freeShipping: r.freeShipping };
  }
  if (code && !couponError && best?.promo.code !== code) couponError = "Ya tenés aplicada una promoción mejor que este cupón.";

  const discount = best?.discount ?? 0;
  const shippingCost = shippingFor(discount, best?.freeShipping ?? false);
  return {
    items,
    subtotal,
    discount,
    shippingCost,
    total: subtotal - discount + shippingCost,
    promotion: best ? { id: best.promo.id, name: best.promo.name, code: best.promo.code } : null,
    couponError,
    zone: zone ? { id: zone.id, name: zone.name } : null,
    zones: zones.map((z) => ({ id: z.id, name: z.name, description: z.description, price: z.price, freeFrom: z.freeFrom, etaText: z.etaText })),
  };
}
