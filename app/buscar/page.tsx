import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { cleanProductName } from "@/lib/format";

export const revalidate = 0;

type SearchRow = {
  id: string;
  slug: string;
  name: string;
  brandSlug: string;
  brandName: string;
  price: number | null;
};

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  let results: SearchRow[] = [];

  if (query.length >= 2) {
    results = await prisma.$queryRaw<SearchRow[]>`
      SELECT p.id, p.slug, p.name, b.slug as "brandSlug", b.name as "brandName",
        (SELECT MIN(v.price) FROM "ProductVariant" v WHERE v."productId" = p.id) as price,
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
      WHERE p.status != 'archivado'
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

  return (
    <main className="min-h-screen bg-[#0b0d0c] text-[#f1f3ef] px-5 py-10 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Resultados para &quot;{query}&quot;</h1>
      <p className="text-white/40 text-sm mb-8">{results.length} productos encontrados</p>

      {results.length === 0 && (
        <p className="text-white/50 text-sm">
          No encontramos nada parecido. Probá con otra palabra o revisá cómo lo escribiste.
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {results.map((p) => (
          <Link
            key={p.id}
            href={`/marcas/${p.brandSlug}/${p.slug}`}
            className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4 flex flex-col gap-1 hover:border-[#1de03c]/40 transition"
          >
            <span className="text-xs text-white/50">{p.brandName}</span>
            <span className="text-sm font-semibold">{cleanProductName(p.name, p.brandName)}</span>
            {p.price && (
              <span className="mt-2 text-[#1de03c] font-medium">
                desde ${Number(p.price).toLocaleString("es-AR")}
              </span>
            )}
          </Link>
        ))}
      </div>
    </main>
  );
}
