// Banners del inicio. Se rotan solos cada 7 s (ver components/HeroCarousel.tsx).
// Un banner con `from`/`to` (AAAA-MM-DD, hora de Argentina) se muestra solo en esas fechas.
// `fixed` siempre queda en la rotación: el de perfumes a pedido.
export type HeroSlide = {
  id: string;
  eyebrow: string;
  title: string;
  accent: string;
  text: string;
  cta: string;
  href: string;
  glow: string; // color de la luz del banner (cambia con cada uno)
  from?: string;
  to?: string;
  fixed?: boolean;
};

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: "bienvenida",
    eyebrow: "Perfumes árabes y de diseñador",
    title: "Te atendemos como a un amigo,",
    accent: "y te asesoramos de verdad.",
    text: "Encontrá tu perfume, pagalo con Mercado Pago y recibilo en casa o retiralo en el local.",
    cta: "Ver perfumes árabes",
    href: "/perfumes-arabes",
    glow: "#1de03c",
  },
  {
    id: "dia-de-la-madre",
    eyebrow: "Día de la Madre · 18 de octubre",
    title: "Regalale un perfume",
    accent: "que la haga sentir especial.",
    text: "Fragancias femeninas elegidas por nosotros, con asesoramiento para acertar.",
    cta: "Ver perfumes femeninos",
    href: "/perfumes-femeninos",
    glow: "#ff4fa3",
    from: "2026-10-01",
    to: "2026-10-18",
  },
  {
    id: "pedido",
    eyebrow: "Perfumes a pedido",
    title: "¿No encontrás el perfume que buscás?",
    accent: "Pedilo por acá.",
    text: "Te lo conseguimos: te pasamos precio y demora por WhatsApp.",
    cta: "Pedir un perfume",
    href: "/perfumes-a-pedido",
    glow: "#1de03c",
    fixed: true,
  },
];

/** Fecha de hoy en Argentina (AAAA-MM-DD). */
export function arToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Banners que corresponden hoy, en el orden de la configuración. */
export function activeHeroSlides(today = arToday()) {
  return HERO_SLIDES.filter((s) => !s.from || (!!s.to && today >= s.from && today <= s.to) || s.fixed);
}
