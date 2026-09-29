// Datos comunes para tarjetas de producto: precio efectivo (con oferta) y foto de portada.
import type { Prisma } from "@prisma/client";

export const cardInclude = {
  brand: true,
  variants: { orderBy: { price: "asc" } },
  images: { orderBy: { sort: "asc" }, take: 1 },
} satisfies Prisma.ProductInclude;

type V = { price: number; salePrice: number | null };
export const effectivePrice = (v: V) => (v.salePrice && v.salePrice > 0 && v.salePrice < v.price ? v.salePrice : v.price);

/** Promo automática con "precio tachado": % sobre el precio de venta, según marca/origen/producto. */
export type SalePromo = { value: number; brandId: string | null; origin: string | null; productIds: string[] };
type Scope = { id?: string; brandId?: string; origin?: string };

export function salePct(promos: SalePromo[] | undefined, p: Scope) {
  let best = 0;
  for (const s of promos ?? []) {
    if (s.brandId && s.brandId !== p.brandId) continue;
    if (s.origin && s.origin !== p.origin) continue;
    if (s.productIds.length && (!p.id || !s.productIds.includes(p.id))) continue;
    best = Math.max(best, Math.min(90, s.value));
  }
  return best;
}

/** Precio final de una presentación con la promo tachada (si hay) y el precio de lista para tachar. */
export function promoPrice(v: V, pct: number) {
  const base = effectivePrice(v);
  const price = pct > 0 ? Math.round((base * (100 - pct)) / 100) : base;
  return { price, compareAt: price < v.price ? v.price : null };
}

/** Precio "desde" (el menor, contando ofertas y promos) y el precio tachado de esa presentación. */
export function priceFrom(variants: V[], pct = 0) {
  if (variants.length === 0) return { price: null, compareAt: null };
  return variants.map((v) => promoPrice(v, pct)).reduce((a, b) => (b.price < a.price ? b : a));
}

export function cardData(
  p: { id?: string; brandId?: string; slug: string; name: string; decantAvailable: boolean; brand: { slug: string; name: string; origin: string }; variants: V[]; images?: { url: string; alt: string | null }[] },
  promos?: SalePromo[]
) {
  return {
    slug: p.slug,
    brandSlug: p.brand.slug,
    brandName: p.brand.name,
    name: p.name,
    decantAvailable: p.decantAvailable,
    origin: p.brand.origin,
    image: p.images?.[0]?.url ?? null,
    ...priceFrom(p.variants, salePct(promos, { id: p.id, brandId: p.brandId, origin: p.brand.origin })),
  };
}

/** URL de Cloudinary con tamaño y formato automáticos (si no es de Cloudinary, se deja igual). */
export function imageUrl(url: string, w: number, h?: number) {
  if (!url.includes("res.cloudinary.com/") || !url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/c_${h ? "fill" : "limit"},w_${w}${h ? `,h_${h}` : ""},f_auto,q_auto/`);
}
