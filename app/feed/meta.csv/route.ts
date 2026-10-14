// Catálogo para Meta (Facebook/Instagram): una fila por presentación publicada. Meta lo lee solo
// (feed programado) desde https://sokoshop.com.ar/feed/meta.csv. El "id" es el de la presentación y
// "item_group_id" el del producto: son los mismos códigos que manda el pixel (lib/track.ts).
import { prisma } from "@/lib/prisma";
import { decantStock, imageUrl, promoPrice, salePct, variantText } from "@/lib/catalog";
import { salePromos } from "@/lib/sale-promos";
import { cleanProductName } from "@/lib/format";

// Se arma en cada pedido (no al compilar); la CDN lo guarda una hora.
export const dynamic = "force-dynamic";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://sokoshop.com.ar";
const COLS = ["id", "item_group_id", "title", "description", "availability", "condition", "price", "sale_price", "link", "image_link", "additional_image_link", "brand", "google_product_category", "product_type", "size"];

// CSV: comillas dobles alrededor y "" adentro; sin saltos de línea.
const cell = (v: string | number | null | undefined) => `"${String(v ?? "").replace(/\s+/g, " ").trim().replace(/"/g, '""')}"`;

export async function GET() {
  const [products, promos] = await Promise.all([
    prisma.product.findMany({
      where: { status: "publicado", brand: { archivedAt: null } },
      include: {
        brand: true,
        variants: { where: { archivedAt: null } },
        images: { where: { kind: "image" }, orderBy: [{ variantId: { sort: "asc", nulls: "first" } }, { sort: "asc" }] },
      },
      orderBy: { name: "asc" },
    }),
    salePromos(),
  ]);

  const rows: string[] = [COLS.join(",")];
  for (const p of products) {
    const general = p.images.filter((i) => !i.variantId);
    if (!p.images.length) continue; // Meta rechaza productos sin foto
    // Marca oculta ("Sin marca", insumos): Meta exige marca, va la de la tienda.
    const brand = p.brand.hidden ? "SokoShop" : p.brand.name;
    const name = cleanProductName(p.name, p.brand.hidden ? "" : p.brand.name);
    const pct = salePct(promos, { id: p.id, brandId: p.brandId, origin: p.brand.origin });
    const perfume = p.brand.origin !== "otros";
    for (const v of p.variants) {
      const own = p.images.filter((i) => i.variantId === v.id);
      const pics = [...own, ...general];
      if (!pics.length) continue;
      const stock = decantStock(v, p.decantMl);
      const { price, compareAt } = promoPrice(v, pct);
      const label = variantText(v);
      rows.push([
        v.id,
        p.id,
        `${p.brand.hidden ? "" : `${brand} `}${name} - ${label}`.slice(0, 150),
        p.descriptionShort ?? `${brand} ${name}, ${label}. ${perfume ? "Perfume original. " : ""}Envíos a todo el país y retiro en el local en Resistencia, Chaco.`,
        stock === null || stock > 0 ? "in stock" : "out of stock",
        "new",
        `${compareAt ?? price} ARS`,
        compareAt ? `${price} ARS` : "",
        `${SITE}/marcas/${p.brand.slug}/${p.slug}`,
        imageUrl(pics[0].url, 1080),
        pics.slice(1, 6).map((i) => imageUrl(i.url, 1080)).join(","),
        brand,
        perfume ? "Health & Beauty > Personal Care > Cosmetics > Perfume & Cologne" : "",
        perfume ? "Perfumes" : "Accesorios",
        v.sizeMl ? `${v.sizeMl} ml` : "",
      ].map(cell).join(","));
    }
  }

  return new Response(rows.join("\n") + "\n", {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600" },
  });
}
