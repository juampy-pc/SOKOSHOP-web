// Datos comunes para tarjetas de producto: precio efectivo (con oferta) y foto de portada.
import type { Prisma } from "@prisma/client";

export const cardInclude = {
  brand: true,
  variants: { orderBy: { price: "asc" } },
  images: { orderBy: { sort: "asc" }, take: 1 },
} satisfies Prisma.ProductInclude;

type V = { price: number; salePrice: number | null };
export const effectivePrice = (v: V) => (v.salePrice && v.salePrice > 0 && v.salePrice < v.price ? v.salePrice : v.price);

/** Precio "desde" (el menor, contando ofertas) y el precio tachado si esa presentación está en oferta. */
export function priceFrom(variants: V[]) {
  if (variants.length === 0) return { price: null, compareAt: null };
  const best = variants.reduce((a, b) => (effectivePrice(b) < effectivePrice(a) ? b : a));
  const price = effectivePrice(best);
  return { price, compareAt: price < best.price ? best.price : null };
}

export function cardData(p: { slug: string; name: string; decantAvailable: boolean; brand: { slug: string; name: string; origin: string }; variants: V[]; images?: { url: string; alt: string | null }[] }) {
  return {
    slug: p.slug,
    brandSlug: p.brand.slug,
    brandName: p.brand.name,
    name: p.name,
    decantAvailable: p.decantAvailable,
    origin: p.brand.origin,
    image: p.images?.[0]?.url ?? null,
    ...priceFrom(p.variants),
  };
}

/** URL de Cloudinary con tamaño y formato automáticos (si no es de Cloudinary, se deja igual). */
export function imageUrl(url: string, w: number, h?: number) {
  if (!url.includes("res.cloudinary.com/") || !url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/c_${h ? "fill" : "limit"},w_${w}${h ? `,h_${h}` : ""},f_auto,q_auto/`);
}
