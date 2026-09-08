import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type SearchRow = {
  id: string;
  slug: string;
  name: string;
  brandSlug: string;
  brandName: string;
  score: number;
};

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  const results = await prisma.$queryRaw<SearchRow[]>`
    SELECT p.id, p.slug, p.name, b.slug as "brandSlug", b.name as "brandName",
      GREATEST(
        word_similarity(${q}, p.name),
        word_similarity(${q}, b.name),
        COALESCE(word_similarity(${q}, p."olfactiveFamily"), 0),
        COALESCE((
          SELECT MAX(word_similarity(${q}, n.name))
          FROM "ProductNote" pn JOIN "Note" n ON n.id = pn."noteId"
          WHERE pn."productId" = p.id
        ), 0)
      ) as score
    FROM "Product" p
    JOIN "Brand" b ON b.id = p."brandId"
    WHERE p.status != 'archivado'
      AND (
        ${q} <% p.name OR ${q} <% b.name
        OR (p."olfactiveFamily" IS NOT NULL AND ${q} <% p."olfactiveFamily")
        OR EXISTS (
          SELECT 1 FROM "ProductNote" pn JOIN "Note" n ON n.id = pn."noteId"
          WHERE pn."productId" = p.id AND ${q} <% n.name
        )
      )
    ORDER BY score DESC
    LIMIT 20;
  `;

  return NextResponse.json(results);
}
