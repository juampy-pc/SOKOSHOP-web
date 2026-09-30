import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { salePromos } from "@/lib/sale-promos";
import ProductCard from "@/components/ProductCard";
import { cardData, cardInclude } from "@/lib/catalog";

type Chip = { href: string; label: string; current?: boolean };

/** Listado de productos publicados con título, bajada y accesos rápidos a listados hermanos. */
export default async function ProductListing({ where, title, intro, chips = [], empty }: { where: Prisma.ProductWhereInput; title: string; intro: string; chips?: Chip[]; empty?: React.ReactNode }) {
  const [promos, products] = await Promise.all([
    salePromos(),
    prisma.product.findMany({ where: { status: "publicado", ...where }, include: cardInclude, orderBy: { name: "asc" } }),
  ]);
  return (
    <main className="min-h-screen bg-[#fafaf9] px-4 md:px-5 py-8 md:py-10 max-w-6xl mx-auto">
      <p className="text-xs text-gray-500 mb-4">
        <Link href="/" className="hover:text-[#17a930]">Inicio</Link> / <span>{title}</span>
      </p>
      <h1 className="text-3xl font-semibold mb-2 text-gray-900">{title}</h1>
      <p className="text-gray-500 text-sm max-w-2xl mb-5">{intro}</p>
      {chips.length > 0 && (
        <nav aria-label="Ver también" className="flex flex-wrap gap-2 mb-6">
          {chips.map((c) => (
            <Link key={c.href} href={c.href} aria-current={c.current ? "page" : undefined}
              className={`rounded-full px-4 py-1.5 text-sm border transition ${c.current ? "bg-[#111] text-white border-[#111]" : "bg-white border-gray-200 text-gray-700 hover:border-[#1de03c]"}`}>
              {c.label}
            </Link>
          ))}
        </nav>
      )}
      {products.length === 0 ? (
        empty ?? <p className="text-gray-500">Pronto vamos a sumar perfumes acá. Mientras tanto, <Link href="/perfumes-a-pedido" className="text-[#17a930] underline">pedinos el que buscás</Link>.</p>
      ) : (
        <>
          <p className="text-xs text-gray-400 mb-3">{products.length} {products.length === 1 ? "perfume" : "perfumes"}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {products.map((p) => <ProductCard key={p.id} {...cardData(p, promos)} />)}
          </div>
        </>
      )}
    </main>
  );
}
