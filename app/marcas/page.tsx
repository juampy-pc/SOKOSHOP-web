import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { originPages } from "@/lib/origin-pages";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Marcas de perfumes | SokoShop",
  description: "Todas las marcas de perfumes de SokoShop: árabes, de diseñador, de nicho e independientes.",
  alternates: { canonical: "/marcas" },
};

const ORDER = ["arabe", "disenador", "nicho", "independiente"] as const;

export default async function BrandsIndex() {
  const brands = await prisma.brand.findMany({
    where: { products: { some: { status: "publicado" } } },
    orderBy: { name: "asc" },
    select: { slug: true, name: true, origin: true, _count: { select: { products: { where: { status: "publicado" } } } } },
  });

  return (
    <main className="min-h-screen bg-[#fafaf9] px-5 py-10 max-w-6xl mx-auto">
      <p className="text-xs text-gray-500 mb-4">
        <Link href="/" className="hover:text-[#17a930]">Inicio</Link> / <span>Marcas</span>
      </p>
      <h1 className="text-3xl font-semibold mb-8 text-gray-900">Marcas</h1>
      {ORDER.map((origin) => {
        const list = brands.filter((b) => b.origin === origin);
        if (list.length === 0) return null;
        const page = originPages[origin === "independiente" ? "independiente" : origin];
        return (
          <section key={origin} className="mb-10">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              <Link href={`/${page.slug}`} className="hover:text-[#17a930]">{page.title}</Link>
            </h2>
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {list.map((b) => (
                <li key={b.slug}>
                  <Link
                    href={`/marcas/${b.slug}`}
                    className="block bg-white rounded-xl px-4 py-3 shadow-[0_1px_6px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_12px_rgba(0,0,0,0.1)] transition"
                  >
                    <span className="block font-medium text-gray-900">{b.name}</span>
                    <span className="text-xs text-gray-500">{b._count.products} productos</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
