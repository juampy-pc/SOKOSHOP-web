import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { originPages } from "@/lib/origin-pages";
import { GENDER_PAGES } from "@/lib/nav-config";

export const revalidate = 3600;
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://sokoshop.com.ar";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, brands] = await Promise.all([
    prisma.product.findMany({ where: { status: "publicado" }, select: { slug: true, updatedAt: true, brand: { select: { slug: true } } } }),
    prisma.brand.findMany({ where: { archivedAt: null, products: { some: { status: "publicado" } } }, select: { slug: true } }),
  ]);
  const fixed = ["", "/marcas", "/decants", "/perfumes-a-pedido", "/contacto", ...Object.values(originPages).map((o) => `/${o.slug}`), ...Object.values(GENDER_PAGES).map((g) => `/${g.slug}`)];
  return [
    ...fixed.map((p) => ({ url: `${SITE}${p}`, changeFrequency: "daily" as const, priority: p === "" ? 1 : 0.7 })),
    ...brands.map((b) => ({ url: `${SITE}/marcas/${b.slug}`, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...products.map((p) => ({ url: `${SITE}/marcas/${p.brand.slug}/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
