"use client";

import { useRef, type ReactNode } from "react";

function Arrow({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="size-5">
      <path d={dir === "prev" ? "M12.5 4.5L7 10l5.5 5.5" : "M7.5 4.5L13 10l-5.5 5.5"} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Carrusel horizontal: en el celular se desliza con el dedo; en la compu suma flechas
 * que avanzan de a una "pantalla". Todos los ítems tienen el mismo ancho.
 */
export default function Rail({ children, label }: { children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
  };
  const btn = "hidden md:grid absolute top-[38%] -translate-y-1/2 z-10 size-10 place-items-center rounded-full bg-white text-gray-900 border border-black/10 shadow-[0_6px_20px_-8px_rgba(17,17,17,0.35)] hover:bg-[#1de03c] hover:border-[#1de03c] transition";
  return (
    <div className="relative" role="region" aria-label={label}>
      <button type="button" onClick={() => move(-1)} className={`${btn} -left-4`} aria-label="Anteriores"><Arrow dir="prev" /></button>
      <div ref={ref} className="-mx-4 md:mx-0 px-4 md:px-0 flex gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory scroll-px-4 md:scroll-px-0 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
      <button type="button" onClick={() => move(1)} className={`${btn} -right-4`} aria-label="Siguientes"><Arrow dir="next" /></button>
    </div>
  );
}
