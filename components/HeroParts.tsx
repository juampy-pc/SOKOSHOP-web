// Contenido de cada banner del inicio (se renderiza en el servidor; el carrusel solo cambia cuál se ve).
import Link from "next/link";
import QuickAdd from "./QuickAdd";
import { cardData, imageUrl } from "@/lib/catalog";
import { cleanProductName, shortProductName } from "@/lib/format";
import type { HeroSlide } from "@/lib/hero-slides";

const ars = (n: number) => `$${n.toLocaleString("es-AR")}`;
type Featured = { p: { id: string }; c: ReturnType<typeof cardData> }[];

/** Primer banner: slogan, botón y los más elegidos (cada tarjeta tiene su propio link, por encima del banner). */
export function HeroBienvenida({ title, accent, text, cta, href, glow, featured }: { title: string; accent: string; text: string; cta: string; href: string; glow: string; featured: Featured }) {
  return (
    <div className="relative max-w-6xl mx-auto px-4 md:px-5 pt-10 pb-8 md:pt-16 md:pb-10 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-10 lg:gap-14 items-center">
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.18em] mb-4" style={{ color: glow }}>Perfumes árabes y de diseñador</p>
        <h1 className="text-[34px] leading-[1.06] md:text-[40px] lg:text-[42px] xl:text-[44px] font-semibold tracking-tight">
          {title}<br className="hidden md:block" /> <span style={{ color: glow }}>{accent}</span>
        </h1>
        <p className="text-white/65 mt-5 max-w-lg text-base md:text-lg leading-relaxed">{text}</p>
        <Link href={href} className="mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold text-[#06140a] hover:bg-white transition" style={{ backgroundColor: glow }}>
          {cta} <span aria-hidden="true">→</span>
        </Link>
      </div>

      {featured.length > 0 && (
        <div className="min-w-0 relative z-10">
          <p className="text-sm font-medium text-white/70 mb-3">Los más elegidos</p>
          <ul className="-mx-4 px-4 lg:mx-0 lg:px-0 flex lg:flex-col gap-3 overflow-x-auto snap-x snap-mandatory lg:overflow-visible pb-1 lg:pb-0 [scrollbar-width:none]">
            {featured.map(({ p, c }) => {
              const pHref = `/marcas/${c.brandSlug}/${c.slug}`;
              const price = c.main?.price ?? c.price;
              return (
                <li key={p.id} className="snap-start shrink-0 w-[78%] sm:w-[48%] lg:w-auto flex gap-3 items-center rounded-2xl bg-white/[0.06] border border-white/10 p-2.5 hover:border-white/25 transition">
                  <Link href={pHref} className="shrink-0">
                    {c.image ? (
                      // eslint-disable-next-line @next/next/no-img-element -- Cloudinary entrega el tamaño justo
                      <img src={imageUrl(c.image, 128, 160)} alt="" width={64} height={80} className="w-16 h-20 rounded-xl object-cover bg-white" />
                    ) : <span className="block w-16 h-20 rounded-xl bg-white/10" />}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={pHref} className="block">
                      <span className="block text-[11px] text-white/45">{c.brandName}</span>
                      <span className="block text-sm font-semibold leading-tight truncate">{shortProductName(c.name, c.brandName)}</span>
                      {price && <span className="block text-sm font-semibold mt-1 tabular-nums" style={{ color: glow }}>{c.main?.from ? "desde " : ""}{ars(price)}</span>}
                    </Link>
                  </div>
                  <div className="w-[88px] shrink-0">
                    {c.quick ? (
                      <QuickAdd variantId={c.quick.variantId} label={c.quick.label} price={c.quick.price} productName={cleanProductName(c.name, c.brandName)} brandName={c.brandName} image={c.image} href={pHref} compact onDark />
                    ) : (
                      <Link href={pHref} className="block text-center rounded-full bg-white text-[#111] text-xs font-medium py-2.5 hover:bg-[#1de03c] hover:text-[#06140a] transition">Ver</Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Banners promocionales (Día de la Madre, perfumes a pedido): todo el banner lleva a la sección. */
export function HeroPromo({ slide }: { slide: HeroSlide }) {
  const glow = slide.glow;
  const steps = slide.fixed
    ? ["Elegís el perfume que buscás", "Te pasamos precio y demora por WhatsApp", "Lo recibís en casa o lo retirás en el local"]
    : null;
  return (
    <div className="relative max-w-6xl mx-auto px-4 md:px-5 pt-10 pb-8 md:pt-16 md:pb-10 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-10 lg:gap-14 items-center">
      <Link href={slide.href} aria-label={`${slide.title} ${slide.accent}: ${slide.cta}`} className="absolute inset-0 z-0" tabIndex={-1} />
      <div className="relative min-w-0 pointer-events-none">
        <p className="text-xs uppercase tracking-[0.18em] mb-4" style={{ color: glow }}>{slide.eyebrow}</p>
        <h1 className="text-[34px] leading-[1.06] md:text-[40px] lg:text-[42px] xl:text-[44px] font-semibold tracking-tight">
          {slide.title}<br className="hidden md:block" /> <span style={{ color: glow }}>{slide.accent}</span>
        </h1>
        <p className="text-white/65 mt-5 max-w-lg text-base md:text-lg leading-relaxed">{slide.text}</p>
        <span className="mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold text-[#06140a]" style={{ backgroundColor: glow }}>
          {slide.cta} <span aria-hidden="true">→</span>
        </span>
      </div>
      <div className="relative min-w-0 pointer-events-none rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8" style={{ boxShadow: `inset 0 0 80px ${glow}22` }}>
        {steps ? (
          <ol className="space-y-4">
            {steps.map((t, k) => (
              <li key={t} className="flex gap-4 items-start">
                <span className="grid place-items-center size-8 shrink-0 rounded-full font-bold text-[#06140a]" style={{ backgroundColor: glow }}>{k + 1}</span>
                <span className="text-white/85 pt-1">{t}</span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm uppercase tracking-[0.2em] text-white/60">Día de la Madre</p>
            <p className="mt-2 text-6xl font-semibold tracking-tight" style={{ color: glow }}>18</p>
            <p className="text-lg text-white/85">de octubre</p>
          </div>
        )}
      </div>
    </div>
  );
}
