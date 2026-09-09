import { prisma } from "@/lib/prisma";
import Link from "next/link";
import HeroSpotlight from "@/components/HeroSpotlight";
import ProductCard from "@/components/ProductCard";
import Faq from "@/components/Faq";
import LocationSection from "@/components/LocationSection";

export const revalidate = 0;

async function getSection(origin?: string, decant?: boolean) {
  return prisma.product.findMany({
    where: {
      status: { not: "archivado" },
      ...(origin ? { brand: { origin } } : {}),
      ...(decant ? { decantAvailable: true } : {}),
    },
    include: { brand: true, variants: { orderBy: { price: "asc" } } },
    orderBy: { name: "asc" },
    take: 8,
  });
}

function Section({
  title,
  tagline,
  href,
  products,
}: {
  title: string;
  tagline: string;
  href: string;
  products: Awaited<ReturnType<typeof getSection>>;
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
          <ProductCard
            key={p.id}
            slug={p.slug}
            brandSlug={p.brand.slug}
            brandName={p.brand.name}
            name={p.name}
            price={p.variants[0]?.price ?? null}
            decantAvailable={p.decantAvailable}
            origin={p.brand.origin}
          />
        ))}
      </div>
    </section>
  );
}

export default async function Home() {
  const [arabes, disenador, decants, independientes] = await Promise.all([
    getSection("arabe"),
    getSection("disenador"),
    getSection(undefined, true),
    getSection("independiente"),
  ]);

  const spotlightItems = arabes.slice(0, 5).map((p) => ({
    slug: p.slug,
    brandSlug: p.brand.slug,
    brandName: p.brand.name,
    name: p.name,
    price: p.variants[0]?.price ?? 0,
    family: p.olfactiveFamily,
  }));

  return (
    <main className="min-h-screen bg-[#fafaf9] px-4 py-6 md:px-8 md:py-10 max-w-6xl mx-auto">
      <div className="mb-12">
        <HeroSpotlight items={spotlightItems} />
      </div>

      <Section
        title="Perfumes árabes"
        tagline="Fragancias orientales de alta intensidad, elegidas por nosotros."
        href="/perfumes-arabes"
        products={arabes}
      />
      <Section
        title="Disponibles para decant"
        tagline="Probá antes de llevarte el frasco completo, al mismo precio por ml."
        href="/perfumes-arabes"
        products={decants}
      />
      <Section
        title="Selección de diseñador"
        tagline="Casas de moda reconocidas, con procedencia verificada."
        href="/perfumes-de-disenador"
        products={disenador}
      />
      <Section
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
