// Datos comunes para tarjetas de producto: precio efectivo (con oferta) y foto de portada.
import type { Prisma } from "@prisma/client";

export const cardInclude = {
  brand: true,
  variants: { orderBy: { price: "asc" } },
  images: { where: { kind: "image" }, orderBy: [{ variantId: { sort: "asc", nulls: "first" } }, { sort: "asc" }], take: 1 },
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

const TYPE_LABEL: Record<string, string> = { decant: "Decant", frasco_completo: "Frasco completo", body_splash: "Body Splash" };
export const variantText = (v: { type: string; sizeMl: number | null }) => `${TYPE_LABEL[v.type] ?? v.type}${v.sizeMl ? ` ${v.sizeMl}ml` : ""}`;

type CardVariant = V & { id?: string; type?: string; sizeMl?: number | null; stock?: number | null };

/** Presentación que se agrega con un toque desde la tarjeta: el frasco completo (o la única que haya) con stock. */
function quickVariant(variants: CardVariant[], pct: number) {
  const buyable = variants.filter((v) => v.id && v.type && (v.stock === null || v.stock === undefined || v.stock > 0));
  const pick = buyable.find((v) => v.type === "frasco_completo") ?? (buyable.length === 1 ? buyable[0] : undefined);
  if (!pick) return null;
  const { price, compareAt } = promoPrice(pick, pct);
  return { variantId: pick.id!, label: variantText({ type: pick.type!, sizeMl: pick.sizeMl ?? null }), price, compareAt, choose: variants.length > 1 };
}

/** El decant más barato, para mostrarlo aparte del precio del frasco. */
function decantFrom(variants: CardVariant[], pct: number) {
  const decants = variants.filter((v) => v.type === "decant");
  return decants.length ? priceFrom(decants, pct).price : null;
}

export function cardData(
  p: { id?: string; brandId?: string; slug: string; name: string; decantAvailable: boolean; brand: { slug: string; name: string; origin: string }; variants: CardVariant[]; images?: { url: string; alt: string | null }[] },
  promos?: SalePromo[]
) {
  const pct = salePct(promos, { id: p.id, brandId: p.brandId, origin: p.brand.origin });
  return {
    quick: quickVariant(p.variants, pct),
    decantPrice: decantFrom(p.variants, pct),
    slug: p.slug,
    brandSlug: p.brand.slug,
    brandName: p.brand.name,
    name: p.name,
    decantAvailable: p.decantAvailable,
    origin: p.brand.origin,
    image: p.images?.[0]?.url ?? null,
    ...priceFrom(p.variants, pct),
  };
}

/** Primer cuadro de un video de Cloudinary como imagen (para miniaturas y como póster). */
export function videoPoster(url: string, w: number, h?: number) {
  if (!url.includes("res.cloudinary.com/") || !url.includes("/video/upload/")) return "";
  return url
    .replace("/video/upload/", `/video/upload/so_0,c_${h ? "fill" : "limit"},w_${w}${h ? `,h_${h}` : ""},f_auto,q_auto/`)
    .replace(/\.(mp4|mov|webm|m4v|avi)(\?.*)?$/i, ".jpg");
}

/** Video de Cloudinary en formato y calidad automáticos (mp4/webm según el navegador). */
export function videoUrl(url: string, w: number) {
  if (!url.includes("res.cloudinary.com/") || !url.includes("/video/upload/")) return url;
  return url.replace("/video/upload/", `/video/upload/c_limit,w_${w},f_auto,q_auto/`);
}

/** URL de Cloudinary con tamaño y formato automáticos (si no es de Cloudinary, se deja igual). */
export function imageUrl(url: string, w: number, h?: number) {
  if (!url.includes("res.cloudinary.com/") || !url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/c_${h ? "fill" : "limit"},w_${w}${h ? `,h_${h}` : ""},f_auto,q_auto/`);
}
