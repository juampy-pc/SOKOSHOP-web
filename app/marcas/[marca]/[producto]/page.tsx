import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import VariantSelector from "@/components/VariantSelector";
import { cleanProductName } from "@/lib/format";

export const revalidate = 0;

export default async function ProductPage({
  params,
}: {
  params: Promise<{ marca: string; producto: string }>;
}) {
  const { marca, producto } = await params;

  const product = await prisma.product.findUnique({
    where: { slug: producto },
    include: {
      brand: true,
      variants: { orderBy: { price: "asc" } },
    },
  });

  if (!product || product.brand.slug !== marca || product.status === "archivado") {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#0b0d0c] text-[#f1f3ef] px-5 py-10 max-w-5xl mx-auto">
      <p className="text-xs text-white/40 mb-8">
        <Link href="/" className="hover:text-[#1de03c]">Inicio</Link> /{" "}
        <span className="text-[#1de03c]">{product.brand.name}</span> /{" "}
        <span>{product.name}</span>
      </p>

      <div className="grid md:grid-cols-2 gap-10">
        <div className="aspect-[4/5] rounded-2xl bg-gradient-to-br from-[#1de03c]/10 to-white/5 border border-white/10 flex items-center justify-center">
          <span className="text-white/20 text-sm">Sin foto todavía</span>
        </div>

        <div>
          <Link href={`/marcas/${product.brand.slug}`} className="text-[#1de03c] text-sm font-semibold hover:underline">{product.brand.name}</Link>
          <h1 className="text-2xl md:text-3xl font-semibold mt-1 mb-4">{cleanProductName(product.name, product.brand.name)}</h1>

          <div className="flex flex-wrap gap-2 mb-6">
            <span className="text-xs border border-white/15 rounded-full px-3 py-1 text-white/70">
              {product.brand.origin === "arabe" ? "Perfumería árabe" : product.brand.origin === "disenador" ? "Diseñador" : "Nicho"}
            </span>
            {product.decantAvailable && (
              <span className="text-xs border border-[#1de03c]/40 bg-[#1de03c]/10 text-[#1de03c] rounded-full px-3 py-1">
                Con probador
              </span>
            )}
          </div>

          <VariantSelector variants={product.variants} productName={cleanProductName(product.name, product.brand.name)} brandName={product.brand.name} />

          {product.notesStructure === "sin_datos" && (
            <p className="text-xs text-white/30 mt-10">
              Ficha olfativa en construcción — todavía no investigamos este producto en detalle.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
