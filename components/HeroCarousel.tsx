"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type HeroCarouselSlide = { id: string; glow: string; content: ReactNode };

const INTERVAL_MS = 7000;

/**
 * Carrusel del inicio. Rota cada 7 s con un cambio suave (fundido + leve desplazamiento) y la luz de
 * fondo cambia de color con cada banner. Se pausa mientras el mouse, el dedo o el foco de teclado están
 * sobre el banner, y vuelve a rotar al soltar. Elegir un puntito muestra ese banner y reinicia los 7 s.
 */
export default function HeroCarousel({ slides, children }: { slides: HeroCarouselSlide[]; children?: ReactNode }) {
  const [i, setI] = useState(0);
  const [hover, setHover] = useState(false);
  const touchEnd = useRef<ReturnType<typeof setTimeout>>(undefined);
  const n = slides.length;
  const running = n > 1 && !hover;

  // Cada cambio de banner (automático o con un puntito) arranca un ciclo nuevo de 7 s.
  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => {
      if (document.visibilityState === "visible") setI((x) => (x + 1) % n);
    }, INTERVAL_MS);
    return () => clearTimeout(t);
  }, [running, n, i]);

  useEffect(() => () => clearTimeout(touchEnd.current), []);

  const glow = slides[i]?.glow ?? "#1de03c";
  return (
    <section
      aria-roledescription="carrusel"
      aria-label="Destacados"
      className="relative overflow-hidden bg-black text-white"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={(e) => { if (e.target.matches(":focus-visible")) setHover(true); }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setHover(false); }}
      onTouchStart={() => { clearTimeout(touchEnd.current); setHover(true); }}
      onTouchEnd={() => { touchEnd.current = setTimeout(() => setHover(false), 3000); }}
    >
      {/* Luz del banner: el color cambia suave con cada uno */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 right-[-10%] size-[520px] rounded-full blur-[120px] opacity-20 transition-colors duration-1000" style={{ backgroundColor: glow }} />
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 -bottom-32 size-[380px] rounded-full blur-[110px] opacity-15 transition-colors duration-1000" style={{ backgroundColor: glow }} />

      <div className="relative grid">
        {slides.map((s, k) => {
          const active = k === i;
          return (
            <div
              key={s.id}
              aria-hidden={!active}
              inert={!active}
              className={`col-start-1 row-start-1 transition-[opacity,transform] duration-[900ms] ease-out motion-reduce:transition-none ${active ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none"}`}
            >
              {s.content}
            </div>
          );
        })}
      </div>

      <div className="relative max-w-6xl mx-auto px-4 md:px-5 pb-6 flex items-center gap-3">
        <div role="group" aria-label="Elegir banner" className="flex items-center gap-2">
          {slides.map((s, k) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setI(k)}
              aria-label={`Banner ${k + 1}`}
              aria-current={k === i}
              className={`h-1.5 rounded-full transition-all duration-500 ${k === i ? "w-8 bg-white" : "w-3 bg-white/30 hover:bg-white/60"}`}
            />
          ))}
        </div>
        {running && (
          <span key={i} aria-hidden="true" className="hero-progress ml-1 h-px w-24 bg-white/15 overflow-hidden rounded"><span className="block h-full bg-white/70" /></span>
        )}
      </div>
      {children}
    </section>
  );
}
