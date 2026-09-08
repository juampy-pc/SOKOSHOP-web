import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { cleanProductName } from "@/lib/format";
import { originPages } from "@/lib/origin-pages";

export const revalidate = 0;

export default async function IndependientesPage() {
  const meta = originPages["independiente"];
  const products = await prisma.product.findMany({
    where: { status: { not: "archivado" }, brand: { origin: "independiente" } },
    include: { brand: true, variants: { orderBy: { price: "asc" } } },
    orderBy: { name: "asc" },
  });

  return (
    <main className="min-h-screen bg-[#0b0d0c] text-[#f1f3ef] px-5 py-10 max-w-5xl mx-auto">
      <p className="text-xs text-white/40 mb-4">
        <Link href="/" className="hover:text-[#1de03c]">Inicio</Link> / <span>{meta.title}</span>
      </p>
      <h1 className="text-3xl font-semibold mb-2">{meta.title}</h1>
      <p className="text-white/50 text-sm max-w-2xl mb-8">{meta.intro}</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((p) => {
          const cheapest = p.variants[0];
          return (
            <Link
              key={p.id}
              href={`/marcas/${p.brand.slug}/${p.slug}`}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4 flex flex-col gap-1 hover:border-[#1de03c]/40 transition"
            >
              <span className="text-xs text-white/50">{p.brand.name}</span>
              <span className="text-sm font-semibold">{cleanProductName(p.name, p.brand.name)}</span>
              {cheapest && (
                <span className="mt-2 text-[#1de03c] font-medium">
                  desde ${cheapest.price.toLocaleString("es-AR")}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </main>
  );
}
