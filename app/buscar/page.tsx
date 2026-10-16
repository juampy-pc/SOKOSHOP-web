import { prisma } from "@/lib/prisma";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { promoPrice, salePct } from "@/lib/catalog";
import { salePromos } from "@/lib/sale-promos";

export const revalidate = 0;

type SearchRow = {
  id: string;
  slug: string;
  name: string;
  brandId: string;
  brandSlug: string;
  brandName: string;
  origin: string;
  decantAvailable: boolean;
  price: number | null;
  image: string | null;
};

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  let results: SearchRow[] = [];
  const promos = await salePromos();

  if (query.length >= 2) {
    results = await prisma.$queryRaw<SearchRow[]>`
      SELECT p.id, p.slug, p.name, p."brandId", b.slug as "brandSlug", CASE WHEN b.hidden THEN '' ELSE b.name END as "brandName", b.origin, p."decantAvailable",
        (SELECT MIN(CASE WHEN v."salePrice" > 0 AND v."salePrice" < v.price THEN v."salePrice" ELSE v.price END) FROM "ProductVariant" v WHERE v."productId" = p.id AND v."archivedAt" IS NULL) as price,
        (SELECT i.url FROM "ProductImage" i WHERE i."productId" = p.id AND i.kind = 'image' ORDER BY i."variantId" NULLS FIRST, i.sort LIMIT 1) as image,
        GREATEST(
          word_similarity(${query}, p.name),
          word_similarity(${query}, b.name),
          COALESCE(word_similarity(${query}, p."olfactiveFamily"), 0),
          COALESCE((
            SELECT MAX(word_similarity(${query}, n.name))
            FROM "ProductNote" pn JOIN "Note" n ON n.id = pn."noteId"
            WHERE pn."productId" = p.id
          ), 0)
        ) as score
      FROM "Product" p
      JOIN "Brand" b ON b.id = p."brandId"
      WHERE p.status = 'publicado'
        AND (
          ${query} <% p.name OR ${query} <% b.name
          OR (p."olfactiveFamily" IS NOT NULL AND ${query} <% p."olfactiveFamily")
          OR EXISTS (
            SELECT 1 FROM "ProductNote" pn JOIN "Note" n ON n.id = pn."noteId"
            WHERE pn."productId" = p.id AND ${query} <% n.name
          )
        )
      ORDER BY score DESC
      LIMIT 48;
    `;
  }

  if (query.length >= 3) {
    // Búsqueda registrada para "más buscados" / "sin resultados" (anónima; no bloquea la página).
    prisma.analyticsEvent
      .create({ data: { type: "search", query: query.toLowerCase().slice(0, 80), results: results.length, path: "/buscar" } })
      .catch(() => {});
  }

  return (
    <main className="min-h-screen bg-[#fafaf9] px-5 py-10 max-w-6xl mx-auto">
      <p className="text-xs text-gray-400 mb-4"><Link href="/" className="hover:text-[#17a930]">Inicio</Link> / <span>Búsqueda</span></p>
      <h1 className="text-2xl font-semibold mb-1 text-gray-900">Resultados para &quot;{query}&quot;</h1>
      <p className="text-gray-400 text-sm mb-8">{results.length} {results.length === 1 ? "producto encontrado" : "productos encontrados"}</p>

      {results.length === 0 && (
        <p className="text-gray-500 text-sm">No encontramos nada parecido. Probá con otra palabra o revisá cómo lo escribiste.</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {results.map((p) => {
          // El mismo precio tachado que en las tarjetas del resto de la tienda.
          const pct = salePct(promos, { id: p.id, brandId: p.brandId, origin: p.origin });
          const price = p.price === null ? null : promoPrice({ price: Number(p.price), salePrice: null }, pct).price;
          return <ProductCard key={p.id} slug={p.slug} brandSlug={p.brandSlug} brandName={p.brandName} name={p.name} price={price} image={p.image} />;
        })}
      </div>
    </main>
  );
}
