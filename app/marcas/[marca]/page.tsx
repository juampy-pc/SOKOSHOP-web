import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { cleanProductName } from "@/lib/format";

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
    brand.origin === "arabe" ? "Perfumería árabe" : brand.origin === "disenador" ? "Diseñador" : "Nicho";

  return (
    <main className="min-h-screen bg-[#0b0d0c] text-[#f1f3ef] px-5 py-10 max-w-5xl mx-auto">
      <p className="text-xs text-white/40 mb-4">
        <Link href="/" className="hover:text-[#1de03c]">Inicio</Link> / <span>{brand.name}</span>
      </p>
      <h1 className="text-3xl font-semibold mb-1">{brand.name}</h1>
      <p className="text-white/40 text-sm mb-8">{originLabel} · {brand.products.length} productos</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {brand.products.map((p) => {
          const cheapest = p.variants[0];
          return (
            <Link
              key={p.id}
              href={`/marcas/${brand.slug}/${p.slug}`}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4 flex flex-col gap-1 hover:border-[#1de03c]/40 transition"
            >
              <span className="text-sm font-semibold">{cleanProductName(p.name, brand.name)}</span>
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
