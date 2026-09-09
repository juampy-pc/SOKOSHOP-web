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
    <main className="min-h-screen bg-[#fafaf9] px-5 py-10 max-w-5xl mx-auto">
      <p className="text-xs text-gray-400 mb-8">
        <Link href="/" className="hover:text-[#17a930]">Inicio</Link> /{" "}
        <Link href={`/marcas/${product.brand.slug}`} className="text-[#17a930] hover:underline">{product.brand.name}</Link> /{" "}
        <span>{product.name}</span>
      </p>

      <div className="grid md:grid-cols-2 gap-10">
        <div className="aspect-[4/5] rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)] flex items-center justify-center">
          <span className="text-gray-300 text-sm">Sin foto todavía</span>
        </div>

        <div>
          <p className="text-[#17a930] text-sm font-semibold">{product.brand.name}</p>
          <h1 className="text-2xl md:text-3xl font-semibold mt-1 mb-4 text-gray-900">{cleanProductName(product.name, product.brand.name)}</h1>

          <div className="flex flex-wrap gap-2 mb-6">
            <span className="text-xs bg-white shadow-[0_1px_6px_rgba(0,0,0,0.06)] rounded-full px-3 py-1 text-gray-600">
              {product.brand.origin === "arabe" ? "Perfumería árabe" : product.brand.origin === "disenador" ? "Diseñador" : product.brand.origin === "nicho" ? "Nicho" : "Independiente"}
            </span>
            {product.decantAvailable && (
              <span className="text-xs bg-[#eafbee] text-[#17a930] rounded-full px-3 py-1 font-medium">
                Con probador
              </span>
            )}
          </div>

          <VariantSelector variants={product.variants} productName={cleanProductName(product.name, product.brand.name)} brandName={product.brand.name} />

          {product.notesStructure === "sin_datos" && (
            <p className="text-xs text-gray-300 mt-10">
              Ficha olfativa en construcción — todavía no investigamos este producto en detalle.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
