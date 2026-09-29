import { prisma } from "@/lib/prisma";
import { salePromos } from "@/lib/sale-promos";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { cardData, cardInclude } from "@/lib/catalog";
import { originPages } from "@/lib/origin-pages";

export const revalidate = 300;

export default async function OriginPage() {
  const meta = originPages["disenador"];
  const promos = await salePromos();
  const products = await prisma.product.findMany({
    where: { status: "publicado", brand: { origin: "disenador" } },
    include: cardInclude,
    orderBy: { name: "asc" },
  });

  return (
    <main className="min-h-screen bg-[#fafaf9] px-5 py-10 max-w-6xl mx-auto">
      <p className="text-xs text-gray-400 mb-4">
        <Link href="/" className="hover:text-[#17a930]">Inicio</Link> / <span>{meta.title}</span>
      </p>
      <h1 className="text-3xl font-semibold mb-2 text-gray-900">{meta.title}</h1>
      <p className="text-gray-400 text-sm max-w-2xl mb-8">{meta.intro}</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((p) => (
          <ProductCard key={p.id} {...cardData(p, promos)} />
        ))}
      </div>
    </main>
  );
}
