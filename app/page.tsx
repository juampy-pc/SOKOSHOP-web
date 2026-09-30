import { prisma } from "@/lib/prisma";
import { salePromos } from "@/lib/sale-promos";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import QuickAdd from "@/components/QuickAdd";
import SearchBox from "@/components/SearchBox";
import Presentation from "@/components/Presentation";
import { cardData, cardInclude, imageUrl } from "@/lib/catalog";
import { cleanProductName, shortProductName } from "@/lib/format";
import { getSetting } from "@/lib/settings";
import Faq from "@/components/Faq";
import LocationSection from "@/components/LocationSection";

export const revalidate = 300;

type Promos = Awaited<ReturnType<typeof salePromos>>;
type CardProduct = Awaited<ReturnType<typeof getSection>>[number];

async function getSection(where: object) {
  return prisma.product.findMany({ where: { status: "publicado", ...where }, include: cardInclude, orderBy: { name: "asc" }, take: 8 });
}

/** Los más vendidos de los últimos 90 días (tienda + local); si todavía no hay ventas, los árabes. */
async function bestSellers() {
  const since = new Date(Date.now() - 90 * 86_400_000);
  const rows = await prisma.orderItem
    .groupBy({
      by: ["productVariantId"],
      where: { isGift: false, order: { status: { in: ["pagado", "pagado_revisar_stock", "entregado"] }, createdAt: { gte: since } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 40,
    })
    .catch(() => []);
  const variants = rows.length ? await prisma.productVariant.findMany({ where: { id: { in: rows.map((r) => r.productVariantId) } }, select: { id: true, productId: true } }) : [];
  const productOf = new Map(variants.map((v) => [v.id, v.productId]));
  const ids = [...new Set(rows.map((r) => productOf.get(r.productVariantId)).filter(Boolean) as string[])];
  const products = ids.length ? await prisma.product.findMany({ where: { id: { in: ids }, status: "publicado" }, include: cardInclude }) : [];
  const sorted = ids.map((id) => products.find((p) => p.id === id)).filter(Boolean) as CardProduct[];
  if (sorted.length >= 3) return sorted.slice(0, 8);
  const extra = await getSection({ brand: { origin: "arabe" }, id: { notIn: sorted.map((p) => p.id) } });
  return [...sorted, ...extra].slice(0, 8);
}

function Section({ title, tagline, href, products, promos }: { title: string; tagline: string; href: string; products: CardProduct[]; promos: Promos }) {
  if (products.length === 0) return null;
  return (
    <section className="mb-14">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold text-gray-900 tracking-tight">{title}</h2>
          <p className="text-gray-500 text-sm mt-1">{tagline}</p>
        </div>
        <Link href={href} className="shrink-0 text-sm font-medium text-[#17a930] hover:underline">Ver todos →</Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {products.map((p) => <ProductCard key={p.id} {...cardData(p, promos)} />)}
      </div>
    </section>
  );
}

const CHIPS = [
  { href: "/perfumes-femeninos", label: "Femeninos" },
  { href: "/perfumes-masculinos", label: "Masculinos" },
  { href: "/perfumes-unisex", label: "Unisex" },
  { href: "/perfumes-arabes", label: "Árabes" },
  { href: "/perfumes-de-disenador", label: "Diseñador" },
  { href: "/decants", label: "Decants" },
];

export default async function Home() {
  const [top, arabes, disenador, decants, promos, store] = await Promise.all([
    bestSellers(),
    getSection({ brand: { origin: "arabe" } }),
    getSection({ brand: { origin: "disenador" } }),
    getSection({ OR: [{ decantAvailable: true }, { variants: { some: { type: "decant" } } }] }),
    salePromos(),
    getSetting("tienda"),
  ]);
  const featured = top.slice(0, 3).map((p) => ({ p, c: cardData(p, promos) }));

  return (
    <main className="min-h-screen bg-[#fafaf9]">
      {/* Hero: buscar o elegir categoría y comprar sin vueltas */}
      <section className="bg-[#111111] text-white">
        <div className="max-w-6xl mx-auto px-4 md:px-5 pt-10 pb-12 md:pt-14 md:pb-16 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] gap-10 items-center">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.18em] text-[#1de03c] mb-4">Perfumes árabes y de diseñador</p>
            <h1 className="text-[34px] leading-[1.08] md:text-5xl font-semibold tracking-tight">
              Te atendemos como a un amigo,<br className="hidden md:block" /> <span className="text-[#1de03c]">no como a un número.</span>
            </h1>
            <p className="text-white/70 mt-4 max-w-lg">Encontrá tu perfume, pagalo con Mercado Pago y recibilo en casa o retiralo en el local.</p>
            <div className="mt-7 max-w-xl flex"><SearchBox /></div>
            <nav aria-label="Categorías" className="mt-4 flex flex-wrap gap-2">
              {CHIPS.map((c) => (
                <Link key={c.href} href={c.href} className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/90 hover:border-[#1de03c] hover:text-[#1de03c] transition">{c.label}</Link>
              ))}
            </nav>
          </div>

          {featured.length > 0 && (
            <div className="min-w-0 rounded-3xl bg-white/[0.06] border border-white/10 p-3 sm:p-4">
              <p className="text-sm font-medium text-white/80 px-1 mb-3">Los más elegidos</p>
              <ul className="space-y-3">
                {featured.map(({ p, c }) => (
                  <li key={p.id} className="flex gap-3 items-center rounded-2xl bg-white text-gray-900 p-2.5">
                    <Link href={`/marcas/${c.brandSlug}/${c.slug}`} className="shrink-0">
                      {c.image ? (
                        // eslint-disable-next-line @next/next/no-img-element -- Cloudinary entrega el tamaño justo
                        <img src={imageUrl(c.image, 128, 160)} alt="" width={64} height={80} className="w-16 h-20 rounded-xl object-cover bg-gray-100" />
                      ) : <span className="block w-16 h-20 rounded-xl bg-gray-100" />}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link href={`/marcas/${c.brandSlug}/${c.slug}`} className="block">
                        <span className="block text-[11px] text-gray-400">{c.brandName}</span>
                        <span className="block text-sm font-semibold leading-tight truncate">{shortProductName(c.name, c.brandName)}</span>
                        {c.price && <span className="block text-sm text-[#17a930] font-semibold mt-0.5">{c.quick && c.quick.price !== c.price ? `$${c.quick.price.toLocaleString("es-AR")}` : `desde $${c.price.toLocaleString("es-AR")}`}</span>}
                      </Link>
                    </div>
                    <div className="w-24 shrink-0">
                      {c.quick ? (
                        <QuickAdd variantId={c.quick.variantId} label={c.quick.label} price={c.quick.price} productName={cleanProductName(c.name, c.brandName)} brandName={c.brandName} image={c.image} href={`/marcas/${c.brandSlug}/${c.slug}`} compact />
                      ) : (
                        <Link href={`/marcas/${c.brandSlug}/${c.slug}`} className="block text-center rounded-full border border-gray-200 text-xs font-medium py-2">Ver</Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      <ul className="max-w-6xl mx-auto px-4 md:px-5 -mt-5 relative grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
        {["100% originales", "Pagá con Mercado Pago", "Envíos a todo el país", "Retiro en el local"].map((t) => (
          <li key={t} className="rounded-xl bg-white shadow-sm px-3 py-3 text-center font-medium text-gray-700">{t}</li>
        ))}
      </ul>

      <div className="max-w-6xl mx-auto px-4 md:px-5 pt-12">
        <Section promos={promos} title="Los más vendidos" tagline="Lo que más se llevan nuestros clientes." href="/perfumes-arabes" products={top} />
        <Section promos={promos} title="Perfumes árabes" tagline="Fragancias orientales de alta intensidad, elegidas por nosotros." href="/perfumes-arabes" products={arabes} />
        <Section promos={promos} title="Selección de diseñador" tagline="Casas de moda reconocidas, con procedencia verificada." href="/perfumes-de-disenador" products={disenador} />

        <Presentation whatsapp={store.whatsapp} />

        <Section promos={promos} title="Decants para probar" tagline="Probá antes de llevarte el frasco completo." href="/decants" products={decants} />

        <section className="mb-14 rounded-3xl bg-[#eafbe9] border border-[#1de03c]/30 px-6 py-8 md:px-10 flex flex-col md:flex-row md:items-center gap-5 justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-gray-900 tracking-tight">¿No encontrás el perfume que buscás?</h2>
            <p className="text-gray-600 mt-1">Pedínoslo y te lo conseguimos: te pasamos precio y demora por WhatsApp.</p>
          </div>
          <Link href="/perfumes-a-pedido" className="shrink-0 rounded-full bg-[#111] text-white font-semibold px-6 py-3 hover:bg-black text-center">Pedir un perfume</Link>
        </section>

        <Faq />
        <LocationSection />
      </div>
    </main>
  );
}
