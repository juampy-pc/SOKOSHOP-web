import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { salePromos } from "@/lib/sale-promos";
import { notFound, permanentRedirect } from "next/navigation";
import { findRedirect } from "@/lib/redirects";
import Link from "next/link";
import VariantSelector from "@/components/VariantSelector";
import Gallery from "@/components/Gallery";
import { SelectedVariantProvider } from "@/components/SelectedVariant";
import { TrackProductView } from "@/components/Analytics";
import { cleanProductName } from "@/lib/format";
import { imageUrl, promoPrice, salePct } from "@/lib/catalog";

export const revalidate = 300;

// Sin páginas pregeneradas: cada ficha se genera en la primera visita y queda en caché (ISR).
export async function generateStaticParams() {
  return [];
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://sokoshop.com.ar";
const LEVELS: { key: string; label: string }[] = [
  { key: "salida", label: "Salida" },
  { key: "corazon", label: "Corazón" },
  { key: "fondo", label: "Fondo" },
];
const GENDER: Record<string, string> = { masculino: "Masculino", femenino: "Femenino", unisex: "Unisex" };

async function load(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      brand: true,
      // Solo lo que se muestra: el costo y el margen nunca salen del servidor (la página los mandaba al navegador).
      variants: { where: { archivedAt: null }, orderBy: { price: "asc" }, select: { id: true, type: true, sizeMl: true, price: true, salePrice: true, stock: true, gtin: true } },
      images: { orderBy: { sort: "asc" } },
      notes: { orderBy: { order: "asc" }, include: { note: true } },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ marca: string; producto: string }> }): Promise<Metadata> {
  const { producto } = await params;
  const p = await load(producto);
  if (!p || p.status !== "publicado") return {};
  const name = `${p.brand.name} ${cleanProductName(p.name, p.brand.name)}`;
  const ogImage = p.images.find((i) => i.kind === "image" && !i.variantId) ?? p.images.find((i) => i.kind === "image");
  return {
    title: `${name} · SokoShop`,
    description: p.descriptionShort ?? `${name} en SokoShop, Resistencia. ${p.decantAvailable ? "También en decant. " : ""}Envíos y retiro en el local.`,
    alternates: { canonical: `/marcas/${p.brand.slug}/${p.slug}` },
    openGraph: ogImage ? { images: [{ url: imageUrl(ogImage.url, 1200, 630) }] } : undefined,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ marca: string; producto: string }> }) {
  const { marca, producto } = await params;
  const product = await load(producto);

  if (!product || product.brand.slug !== marca || product.status !== "publicado") {
    const r = await findRedirect(`/marcas/${marca}/${producto}`);
    if (r?.to) permanentRedirect(r.to);
    notFound();
  }

  const title = cleanProductName(product.name, product.brand.name);
  // Fotos (sin videos): las generales van en la portada, el carrito y los buscadores; las de una presentación, cuando la eligen.
  const photos = product.images.filter((i) => i.kind === "image");
  const cover = photos.find((i) => !i.variantId) ?? photos[0] ?? null;
  const imageFor = Object.fromEntries(product.variants.map((v) => [v.id, photos.find((i) => i.variantId === v.id)?.url]).filter((e): e is [string, string] => Boolean(e[1])));
  // Promo automática con precio tachado: se muestra como precio de oferta (el checkout la vuelve a calcular).
  const pct = salePct(await salePromos(), { id: product.id, brandId: product.brandId, origin: product.brand.origin });
  const variants = product.variants.map((v) => (pct ? { ...v, salePrice: promoPrice(v, pct).price } : v));
  const pyramid = LEVELS.map((l) => ({ ...l, notes: product.notes.filter((n) => n.position === l.key).map((n) => n.note.name) })).filter((l) => l.notes.length);
  const main = product.notes.filter((n) => !LEVELS.some((l) => l.key === n.position)).map((n) => n.note.name);
  const facts = [
    product.concentration && ["Concentración", product.concentration],
    product.gender && ["Género", GENDER[product.gender] ?? product.gender],
    product.olfactiveFamily && ["Familia olfativa", product.olfactiveFamily],
    product.launchYear && ["Lanzamiento", String(product.launchYear)],
    product.perfumer && ["Perfumista", product.perfumer],
  ].filter(Boolean) as [string, string][];
  const url = `${SITE}/marcas/${product.brand.slug}/${product.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${product.brand.name} ${title}`,
    brand: { "@type": "Brand", name: product.brand.name },
    ...(photos.length ? { image: photos.map((i) => imageUrl(i.url, 1200)) } : {}),
    ...(product.descriptionShort ? { description: product.descriptionShort } : {}),
    url,
    offers: variants.map((v) => ({
      "@type": "Offer",
      price: promoPrice(v, 0).price,
      priceCurrency: "ARS",
      availability: v.stock === null || v.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url,
      ...(v.gtin ? { gtin13: v.gtin } : {}),
    })),
  };

  return (
    <main className="min-h-screen bg-[#fafaf9] px-5 py-10 max-w-5xl mx-auto">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <p className="text-xs text-gray-400 mb-8">
        <Link href="/" className="hover:text-[#17a930]">Inicio</Link> /{" "}
        <Link href={`/marcas/${product.brand.slug}`} className="text-[#17a930] hover:underline">{product.brand.name}</Link> /{" "}
        <span>{title}</span>
      </p>

      <TrackProductView productId={product.id} />
      <SelectedVariantProvider initial={null}>
      <div className="grid md:grid-cols-2 gap-10">
        <Gallery images={product.images.map((i) => ({ url: i.url, alt: i.alt, kind: i.kind, variantId: i.variantId }))} alt={`${product.brand.name} ${title}`} />

        <div>
          <p className="text-[#17a930] text-sm font-semibold">{product.brand.name}</p>
          <h1 className="text-2xl md:text-3xl font-semibold mt-1 mb-4 text-gray-900">{title}</h1>

          <div className="flex flex-wrap gap-2 mb-6">
            <span className="text-xs bg-white shadow-[0_1px_6px_rgba(0,0,0,0.06)] rounded-full px-3 py-1 text-gray-600">
              {product.brand.origin === "arabe" ? "Perfumería árabe" : product.brand.origin === "disenador" ? "Diseñador" : product.brand.origin === "nicho" ? "Nicho" : "Independiente"}
            </span>
            {product.decantAvailable && <span className="text-xs bg-[#eafbee] text-[#17a930] rounded-full px-3 py-1 font-medium">Con probador</span>}
            {pct > 0 && <span className="text-xs bg-[#1de03c] text-[#06140a] rounded-full px-3 py-1 font-semibold">{pct}% OFF</span>}
          </div>

          <VariantSelector
            variants={variants}
            productName={title}
            brandName={product.brand.name}
            image={cover?.url ?? null}
            imageFor={imageFor}
            href={`/marcas/${product.brand.slug}/${product.slug}`}
          />

          {product.descriptionShort && <p className="text-gray-600 text-sm leading-relaxed mt-8">{product.descriptionShort}</p>}

          {(pyramid.length > 0 || main.length > 0 || facts.length > 0) ? (
            <section className="mt-8" aria-labelledby="h-ficha">
              <h2 id="h-ficha" className="text-sm font-semibold text-gray-900 mb-3">Ficha olfativa</h2>
              {pyramid.length > 0 && (
                <dl className="space-y-2 mb-4">
                  {pyramid.map((l) => (
                    <div key={l.key} className="grid grid-cols-[90px_1fr] gap-3 text-sm">
                      <dt className="text-gray-400">{l.label}</dt>
                      <dd className="flex flex-wrap gap-1.5">{l.notes.map((n) => <span key={n} className="bg-white shadow-[0_1px_6px_rgba(0,0,0,0.06)] rounded-full px-2.5 py-0.5 text-gray-700">{n}</span>)}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {main.length > 0 && (
                <p className="text-sm mb-4"><span className="text-gray-400">Notas principales: </span>{main.join(", ")}</p>
              )}
              {facts.length > 0 && (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {facts.map(([k, v]) => <div key={k}><dt className="text-gray-400 text-xs">{k}</dt><dd className="text-gray-800">{v}</dd></div>)}
                </dl>
              )}
            </section>
          ) : (
            <p className="text-xs text-gray-300 mt-10">Ficha olfativa en construcción — todavía no investigamos este producto en detalle.</p>
          )}
          {product.descriptionLong && <div className="mt-8 text-sm text-gray-600 leading-relaxed whitespace-pre-line">{product.descriptionLong}</div>}
        </div>
      </div>
      </SelectedVariantProvider>
    </main>
  );
}
