import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { originPages } from "@/lib/origin-pages";

export const revalidate = 0;

export default async function BrandPage({
  params,
}: {
  params: Promise<{ marca: string }>;
}) {
  const { marca } = await params;

  const brand = await prisma.brand.findUnique({
    where: { slug: marca },
    include: {
      products: {
        where: { status: { not: "archivado" } },
        include: { variants: { orderBy: { price: "asc" } } },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!brand) notFound();

  const originLabel =
    brand.origin === "arabe" ? "Perfumería árabe" : brand.origin === "disenador" ? "Diseñador" : brand.origin === "nicho" ? "Nicho" : "Independiente";

  return (
    <main className="min-h-screen bg-[#fafaf9] px-5 py-10 max-w-6xl mx-auto">
      <p className="text-xs text-gray-400 mb-4">
        <Link href="/" className="hover:text-[#17a930]">Inicio</Link> / <span>{brand.name}</span>
      </p>
      <h1 className="text-3xl font-semibold mb-1 text-gray-900">{brand.name}</h1>
      <p className="text-gray-400 text-sm mb-8">{originLabel} · {brand.products.length} productos</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {brand.products.map((p) => (
          <ProductCard
            key={p.id}
            slug={p.slug}
            brandSlug={brand.slug}
            brandName={brand.name}
            name={p.name}
            price={p.variants[0]?.price ?? null}
            decantAvailable={p.decantAvailable}
            origin={brand.origin}
          />
        ))}
      </div>
    </main>
  );
}
