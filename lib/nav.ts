// Menú de la tienda: marcas agrupadas por origen (solo con productos publicados).
import { prisma } from "@/lib/prisma";
import { originPages } from "@/lib/origin-pages";
import { ORIGIN_MENU, type NavGroup } from "@/lib/nav-config";

export { GENDER_PAGES, whatsappLink, type NavGroup } from "@/lib/nav-config";

export async function navGroups(): Promise<NavGroup[]> {
  const brands = await prisma.brand
    .findMany({
      where: { archivedAt: null, products: { some: { status: "publicado" } } },
      orderBy: { name: "asc" },
      select: { slug: true, name: true, origin: true },
    })
    .catch(() => []);
  return ORIGIN_MENU.map(({ origin, label }) => ({
    origin,
    label,
    href: `/${originPages[origin].slug}`,
    brands: brands.filter((b) => b.origin === origin).map(({ slug, name }) => ({ slug, name })),
  })).filter((g) => g.brands.length > 0);
}
