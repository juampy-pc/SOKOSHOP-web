// Cotización del carrito del lado del servidor: precios, promociones/cupón, regalos y envío o retiro.
// El navegador solo manda variantes y cantidades; todo lo demás se calcula acá.
import { prisma } from "@/lib/prisma";
import { cleanProductName } from "@/lib/format";
import { effectivePrice } from "@/lib/catalog";
import { describePromo, evaluatePromos } from "@/lib/promo-engine";
import { activePromoWhere, loadGifts, promosUsedBy, variantLabel } from "@/lib/promo-data";
import { hasArea, normalizeZip, zoneCovers } from "@/lib/shipping";

export const MAX_QTY_PER_ITEM = 10;
export const MAX_LINES = 30;

export type CartLine = { variantId: string; qty: number };
export type QuoteInput = {
  lines: CartLine[];
  couponCode?: string | null;
  deliveryMethod?: "envio" | "retiro" | null;
  /** envío: zona elegida · retiro: punto de retiro elegido */
  zoneId?: string | null;
  email?: string | null;
  zip?: string | null;
};

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

const money = (n: number) => `$${n.toLocaleString("es-AR")}`;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Zonas de envío y puntos de retiro visibles en la tienda. */
export async function deliveryOptions() {
  const all = await prisma.shippingZone.findMany({ where: { active: true, archivedAt: null }, orderBy: [{ sort: "asc" }, { name: "asc" }] });
  const zones = all.filter((z) => z.kind !== "retiro").map((z) => ({
    id: z.id, name: z.name, description: z.description, price: z.price, freeFrom: z.freeFrom, minOrder: z.minOrder,
    etaText: z.etaText, deliveryDays: z.deliveryDays, postalCodes: z.postalCodes, localities: z.localities,
  }));
  const pickups = all.filter((z) => z.kind === "retiro").map((z) => ({
    id: z.id, name: z.name, description: z.description, price: z.price, freeFrom: z.freeFrom, minOrder: z.minOrder,
    etaText: z.etaText, address: z.address, hours: z.hours,
  }));
  return { zones, pickups };
}
export type DeliveryZone = Awaited<ReturnType<typeof deliveryOptions>>["zones"][number];
export type PickupPoint = Awaited<ReturnType<typeof deliveryOptions>>["pickups"][number];

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
      productId: v.productId,
      brandId: v.product.brandId,
      origin: v.product.brand.origin,
      type: v.type,
      sizeMl: v.sizeMl,
      brandName: v.product.brand.name,
      productName,
      variantLabel: variantLabel(v),
      price: effectivePrice(v),
      qty: l.qty,
      isGift: false,
    };
  });
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);

  // Envío o retiro
  const { zones, pickups } = await deliveryOptions();
  const method = input.deliveryMethod ?? null;
  let selected: (DeliveryZone | PickupPoint) | null = null;
  if (method === "envio") {
    selected = zones.find((z) => z.id === input.zoneId) ?? null;
    if (input.zoneId && !selected) throw new QuoteError("La zona de envío ya no está disponible.");
  } else if (method === "retiro" && pickups.length > 0) {
    selected = pickups.find((p) => p.id === input.zoneId) ?? pickups[0];
  }
  const shipping = (discount: number, free: boolean) => {
    if (!selected || free) return 0;
    if (selected.freeFrom && subtotal - discount >= selected.freeFrom) return 0;
    return selected.price;
  };

  // Promociones vigentes (automáticas) + cupón ingresado: el motor elige la mejor para el cliente.
  const code = input.couponCode?.trim().toUpperCase() || null;
  const promos = await prisma.promotion.findMany({ where: { ...activePromoWhere(), OR: [{ code: null }, ...(code ? [{ code }] : [])] } });
  const email = input.email && EMAIL.test(input.email) ? input.email.toLowerCase() : null;
  const [used, gifts] = await Promise.all([
    promos.some((p) => p.onePerCustomer) ? promosUsedBy(email) : Promise.resolve(new Set<string>()),
    loadGifts(promos, items),
  ]);
  const r = evaluatePromos({ items, promos, code, usedByCustomer: used, customerKnown: Boolean(email), shipping, ...gifts });

  const gift = r.gift
    ? { variantId: r.gift.variantId, productId: r.gift.productId, brandId: "", origin: "", type: "", sizeMl: r.gift.sizeMl, brandName: r.gift.brandName, productName: r.gift.productName, variantLabel: `${r.gift.label} · regalo`, price: 0, qty: 1, isGift: true }
    : null;
  const shippingCost = shipping(r.discount, r.freeShipping);

  // Compra mínima de la zona/punto y cobertura por código postal o localidad
  const minOrderError = selected?.minOrder && subtotal < selected.minOrder ? `${selected.name} requiere una compra mínima de ${money(selected.minOrder)}.` : null;
  let areaError: string | null = null;
  // zip === null: todavía no lo escribió (cotización); "" al pagar: falta.
  if (method === "envio" && selected && "postalCodes" in selected && hasArea(selected) && input.zip != null) {
    if (!normalizeZip(input.zip)) areaError = "Escribí tu código postal para confirmar la zona de envío.";
    else if (zoneCovers(selected, input.zip) === false) areaError = `Tu código postal no está dentro de “${selected.name}”. Elegí la zona que corresponde.`;
  }

  return {
    items: gift ? [...items, gift] : items,
    gift,
    subtotal,
    discount: r.discount,
    shippingCost,
    total: subtotal - r.discount + shippingCost,
    promotion: r.promo ? { id: r.promo.id, name: r.promo.name, code: r.promo.code, summary: describePromo(r.promo) } : null,
    couponError: r.couponError,
    zone: selected ? { id: selected.id, name: selected.name, kind: method } : null,
    minOrderError,
    areaError,
    zones,
    pickups,
  };
}
