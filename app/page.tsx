import { prisma } from "@/lib/prisma";
import { salePromos } from "@/lib/sale-promos";
import Link from "next/link";
import HeroSpotlight from "@/components/HeroSpotlight";
import ProductCard from "@/components/ProductCard";
import { cardData, cardInclude, priceFrom, salePct } from "@/lib/catalog";
import Faq from "@/components/Faq";
import LocationSection from "@/components/LocationSection";

export const revalidate = 300;

async function getSection(origin?: string, decant?: boolean) {
  return prisma.product.findMany({
    where: {
      status: "publicado",
      ...(origin ? { brand: { origin } } : {}),
      ...(decant ? { decantAvailable: true } : {}),
    },
    include: cardInclude,
    orderBy: { name: "asc" },
    take: 8,
  });
}

function Section({
  title,
  tagline,
  href,
  products,
  promos,
}: {
  title: string;
  tagline: string;
  href: string;
  products: Awaited<ReturnType<typeof getSection>>;
  promos: Awaited<ReturnType<typeof salePromos>>;
}) {
  if (products.length === 0) return null;
  return (
    <section className="mb-12">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <Link href={href} className="text-xs text-[#17a930] hover:underline">
          Ver más →
        </Link>
      </div>
      <p className="text-gray-400 text-sm mb-4">{tagline}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((p) => (
          <ProductCard key={p.id} {...cardData(p, promos)} />
        ))}
      </div>
    </section>
  );
}

export default async function Home() {
  const [arabes, disenador, decants, independientes, promos] = await Promise.all([
    getSection("arabe"),
    getSection("disenador"),
    getSection(undefined, true),
    getSection("independiente"),
    salePromos(),
  ]);

  const spotlightItems = arabes.slice(0, 5).map((p) => ({
    slug: p.slug,
    brandSlug: p.brand.slug,
    brandName: p.brand.name,
    name: p.name,
    price: priceFrom(p.variants, salePct(promos, { id: p.id, brandId: p.brandId, origin: p.brand.origin })).price ?? 0,
    image: p.images[0]?.url ?? null,
    family: p.olfactiveFamily,
  }));

  return (
    <main className="min-h-screen bg-[#fafaf9] px-4 py-6 md:px-8 md:py-10 max-w-6xl mx-auto">
      <div className="mb-12">
        <HeroSpotlight items={spotlightItems} />
      </div>

      <Section
        promos={promos}
        title="Perfumes árabes"
        tagline="Fragancias orientales de alta intensidad, elegidas por nosotros."
        href="/perfumes-arabes"
        products={arabes}
      />
      <Section
        promos={promos}
        title="Disponibles para decant"
        tagline="Probá antes de llevarte el frasco completo, al mismo precio por ml."
        href="/perfumes-arabes"
        products={decants}
      />
      <Section
        promos={promos}
        title="Selección de diseñador"
        tagline="Casas de moda reconocidas, con procedencia verificada."
        href="/perfumes-de-disenador"
        products={disenador}
      />
      <Section
        promos={promos}
        title="Marcas independientes"
        tagline="Perfumistas por su cuenta, buena relación calidad-precio."
        href="/marcas-independientes"
        products={independientes}
      />

      <Faq />
      <LocationSection />
    </main>
  );
}
