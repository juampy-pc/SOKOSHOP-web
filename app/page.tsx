import { prisma } from "@/lib/prisma";
import { salePromos } from "@/lib/sale-promos";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import QuickAdd from "@/components/QuickAdd";
import SearchBox from "@/components/SearchBox";
import Presentation from "@/components/Presentation";
import { cardData, cardInclude, imageUrl } from "@/lib/catalog";
import { cleanProductName, shortProductName } from "@/lib/format";
import type { ReactNode } from "react";
import { getSetting } from "@/lib/settings";
import Faq from "@/components/Faq";
import LocationSection from "@/components/LocationSection";
import Marquee from "@/components/Marquee";

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

const ars = (n: number) => `$${n.toLocaleString("es-AR")}`;

function SectionHead({ title, tagline, href, link = "Ver todos" }: { title: string; tagline: string; href: string; link?: string }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-5">
      <div>
        <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 tracking-tight">{title}</h2>
        <p className="text-gray-500 text-sm md:text-base mt-1">{tagline}</p>
      </div>
      <Link href={href} className="shrink-0 text-sm font-medium text-gray-900 underline decoration-[#1de03c] decoration-2 underline-offset-4 hover:text-[#17a930]">{link}</Link>
    </div>
  );
}

/** Grilla clásica: la usan los más vendidos. */
function GridSection({ products, promos, children }: { products: CardProduct[]; promos: Promos; children: ReactNode }) {
  if (products.length === 0) return null;
  return (
    <section className="mb-16">
      {children}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {products.map((p) => <ProductCard key={p.id} {...cardData(p, promos)} />)}
      </div>
    </section>
  );
}

/** Bento: un perfume destacado grande y cuatro al lado (árabes). */
function FeatureSection({ products, promos, children }: { products: CardProduct[]; promos: Promos; children: ReactNode }) {
  if (products.length === 0) return null;
  const [first, ...rest] = products;
  const c = cardData(first, promos);
  const href = `/marcas/${c.brandSlug}/${c.slug}`;
  const price = c.quick?.price ?? c.price;
  return (
    <section className="mb-16">
      {children}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Link href={href} className="group col-span-2 lg:row-span-2 rounded-3xl bg-white border border-black/[0.04] overflow-hidden flex flex-col sm:flex-row lg:flex-col">
          <div className="relative sm:w-1/2 lg:w-full flex-1 min-h-0 aspect-[4/5] sm:aspect-auto lg:aspect-auto overflow-hidden bg-white">
            {c.image ? (
              // eslint-disable-next-line @next/next/no-img-element -- Cloudinary entrega el tamaño justo
              <img src={imageUrl(c.image, 720, 900)} alt={`${c.brandName} ${cleanProductName(c.name, c.brandName)}`} loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700" />
            ) : null}
          </div>
          <div className="p-5 md:p-6 sm:w-1/2 lg:w-full flex flex-col justify-center">
            <span className="text-[11px] uppercase tracking-wide text-gray-400">{c.brandName}</span>
            <span className="text-2xl font-semibold tracking-tight text-gray-900 mt-1">{shortProductName(c.name, c.brandName)}</span>
            <span className="flex items-center justify-between gap-3 mt-3">
              {price ? <span className="text-lg font-semibold tabular-nums">{c.quick ? "" : <span className="text-sm font-normal text-gray-500 mr-1">desde</span>}{ars(price)}</span> : <span />}
              <span className="rounded-full bg-[#111] text-white text-sm font-medium px-5 py-2.5 group-hover:bg-[#1de03c] group-hover:text-[#06140a] transition">Ver perfume</span>
            </span>
          </div>
        </Link>
        {rest.slice(0, 4).map((p) => <ProductCard key={p.id} {...cardData(p, promos)} />)}
      </div>
    </section>
  );
}

/** Carrusel horizontal (decants): se desliza con el dedo, sin JavaScript. */
function RailSection({ products, promos, children }: { products: CardProduct[]; promos: Promos; children: ReactNode }) {
  if (products.length === 0) return null;
  return (
    <section className="mb-16">
      {children}
      <div className="-mx-4 md:-mx-5 px-4 md:px-5 flex gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory scroll-px-4 pb-2 [scrollbar-width:thin]">
        {products.map((p) => (
          <div key={p.id} className="snap-start shrink-0 w-[46%] sm:w-[31%] lg:w-[23.5%]"><ProductCard {...cardData(p, promos)} /></div>
        ))}
      </div>
    </section>
  );
}

const CHIPS = [
  { href: "/perfumes-femeninos", label: "Femeninos" },
  { href: "/perfumes-masculinos", label: "Masculinos" },
  { href: "/perfumes-arabes", label: "Árabes" },
  { href: "/decants", label: "Decants" },
];

const TRUST = [
  { t: "100% originales", d: "Procedencia verificada" },
  { t: "Mercado Pago", d: "Tarjetas y dinero en cuenta" },
  { t: "Envíos a todo el país", d: "O retiro en Resistencia" },
  { t: "Asesoramiento real", d: "Te ayudamos a elegir" },
];

export default async function Home() {
  const [top, arabes, disenador, decants, promos, store, designerBrands] = await Promise.all([
    bestSellers(),
    getSection({ brand: { origin: "arabe" } }),
    getSection({ brand: { origin: "disenador" } }),
    getSection({ OR: [{ decantAvailable: true }, { variants: { some: { type: "decant" } } }] }),
    salePromos(),
    getSetting("tienda"),
    prisma.brand.findMany({ where: { origin: "disenador", products: { some: { status: "publicado" } } }, select: { slug: true, name: true }, orderBy: { name: "asc" }, take: 12 }).catch(() => []),
  ]);
  const featured = top.slice(0, 3).map((p) => ({ p, c: cardData(p, promos) }));

  return (
    <main className="min-h-screen bg-[#fafaf9]">
      {/* Hero: buscar o elegir categoría y comprar sin vueltas */}
      <section className="relative overflow-hidden bg-black text-white">
        <div aria-hidden="true" className="pointer-events-none absolute -top-40 right-[-10%] size-[520px] rounded-full bg-[#1de03c]/15 blur-[120px]" />
        <div className="relative max-w-6xl mx-auto px-4 md:px-5 pt-10 pb-12 md:pt-16 md:pb-20 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-10 lg:gap-14 items-center">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.18em] text-[#1de03c] mb-4">Perfumes árabes y de diseñador</p>
            <h1 className="text-[34px] leading-[1.06] md:text-[40px] lg:text-[42px] xl:text-[44px] font-semibold tracking-tight">
              Te atendemos como a un amigo,<br className="hidden md:block" /> <span className="text-[#1de03c]">y te asesoramos de verdad.</span>
            </h1>
            <p className="text-white/65 mt-5 max-w-lg text-base md:text-lg leading-relaxed">Encontrá tu perfume, pagalo con Mercado Pago y recibilo en casa o retiralo en el local.</p>
            <div className="mt-8 max-w-xl flex"><SearchBox /></div>
            <nav aria-label="Categorías" className="mt-4 flex flex-wrap gap-2">
              {CHIPS.map((c) => (
                <Link key={c.href} href={c.href} className="rounded-full border border-white/15 px-3 sm:px-4 py-2 text-[13px] sm:text-sm text-white/85 hover:border-[#1de03c] hover:text-[#1de03c] transition">{c.label}</Link>
              ))}
            </nav>
          </div>

          {featured.length > 0 && (
            <div className="min-w-0">
              <p className="text-sm font-medium text-white/70 mb-3">Los más elegidos</p>
              <ul className="-mx-4 px-4 lg:mx-0 lg:px-0 flex lg:flex-col gap-3 overflow-x-auto snap-x snap-mandatory lg:overflow-visible pb-1 lg:pb-0 [scrollbar-width:none]">
                {featured.map(({ p, c }) => {
                  const href = `/marcas/${c.brandSlug}/${c.slug}`;
                  const price = c.quick?.price ?? c.price;
                  return (
                    <li key={p.id} className="snap-start shrink-0 w-[78%] sm:w-[48%] lg:w-auto flex gap-3 items-center rounded-2xl bg-white/[0.06] border border-white/10 p-2.5 hover:border-white/25 transition">
                      <Link href={href} className="shrink-0">
                        {c.image ? (
                          // eslint-disable-next-line @next/next/no-img-element -- Cloudinary entrega el tamaño justo
                          <img src={imageUrl(c.image, 128, 160)} alt="" width={64} height={80} className="w-16 h-20 rounded-xl object-cover bg-white" />
                        ) : <span className="block w-16 h-20 rounded-xl bg-white/10" />}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link href={href} className="block">
                          <span className="block text-[11px] text-white/45">{c.brandName}</span>
                          <span className="block text-sm font-semibold leading-tight truncate">{shortProductName(c.name, c.brandName)}</span>
                          {price && <span className="block text-sm text-[#1de03c] font-semibold mt-1 tabular-nums">{c.quick ? "" : "desde "}{ars(price)}</span>}
                        </Link>
                      </div>
                      <div className="w-[88px] shrink-0">
                        {c.quick ? (
                          <QuickAdd variantId={c.quick.variantId} label={c.quick.label} price={c.quick.price} productName={cleanProductName(c.name, c.brandName)} brandName={c.brandName} image={c.image} href={href} compact onDark />
                        ) : (
                          <Link href={href} className="block text-center rounded-full bg-white text-[#111] text-xs font-medium py-2.5 hover:bg-[#1de03c] hover:text-[#06140a] transition">Ver</Link>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* Por qué comprarnos: una fila sobria, sin tarjetas */}
      <section aria-label="Por qué comprar en SokoShop" className="bg-white border-b border-black/5">
        <ul className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-px bg-black/5">
          {TRUST.map((x) => (
            <li key={x.t} className="bg-white py-5 px-4 md:px-5 flex gap-3 items-start">
              <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-[#1de03c] shadow-[0_0_10px_rgba(29,224,60,0.7)]" />
              <span>
                <span className="block text-sm font-semibold text-gray-900">{x.t}</span>
                <span className="block text-xs text-gray-500 mt-0.5">{x.d}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="max-w-6xl mx-auto px-4 md:px-5 pt-14">
        <GridSection promos={promos} products={top}>
          <SectionHead title="Los más vendidos" tagline="Lo que más se llevan nuestros clientes." href="/perfumes-arabes" />
        </GridSection>
      </div>

      <Marquee />

      <div className="max-w-6xl mx-auto px-4 md:px-5 pt-16">
        <FeatureSection promos={promos} products={arabes}>
          <SectionHead title="Perfumes árabes" tagline="Fragancias orientales de alta intensidad, elegidas por nosotros." href="/perfumes-arabes" />
        </FeatureSection>

        <Presentation whatsapp={store.whatsapp} />

        {disenador.length > 0 && (
          <section className="mb-16">
            <SectionHead title="Selección de diseñador" tagline="Casas de moda reconocidas, con procedencia verificada." href="/perfumes-de-disenador" />
            {designerBrands.length > 0 && (
              <nav aria-label="Marcas de diseñador" className="flex flex-wrap gap-2 mb-5">
                {designerBrands.map((b) => (
                  <Link key={b.slug} href={`/marcas/${b.slug}`} className="rounded-full bg-white border border-black/10 px-4 py-1.5 text-sm text-gray-700 hover:border-[#1de03c] hover:text-[#17a930] transition">{b.name}</Link>
                ))}
              </nav>
            )}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {disenador.slice(0, 4).map((p) => <ProductCard key={p.id} {...cardData(p, promos)} />)}
            </div>
          </section>
        )}

        <RailSection promos={promos} products={decants}>
          <SectionHead title="Decants para probar" tagline="Probá antes de llevarte el frasco completo. Deslizá para ver más." href="/decants" />
        </RailSection>

        <section className="mb-16 rounded-3xl bg-[#111] text-white px-6 py-8 md:px-10 md:py-10 flex flex-col md:flex-row md:items-center gap-5 justify-between relative overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute -left-20 -bottom-24 size-72 rounded-full bg-[#1de03c]/20 blur-3xl" />
          <div className="relative">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">¿No encontrás el perfume que buscás?</h2>
            <p className="text-white/65 mt-2">Pedínoslo y te lo conseguimos: te pasamos precio y demora por WhatsApp.</p>
          </div>
          <Link href="/perfumes-a-pedido" className="relative shrink-0 rounded-full bg-[#1de03c] text-[#06140a] font-semibold px-7 py-3.5 hover:bg-white text-center transition">Pedir un perfume</Link>
        </section>

        <Faq />
        <LocationSection />
      </div>
    </main>
  );
}
