"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { WhatsIcon } from "./Presentation";

const KEY = "soko-wa-bubble-closed";

/** Botón flotante de WhatsApp con el cartel "¿Tenés dudas?" (se puede cerrar y no vuelve en la visita). */
export default function WhatsAppBubble({ href }: { href: string }) {
  const pathname = usePathname();
  const [bubble, setBubble] = useState(false);

  useEffect(() => {
    let closed = false;
    try { closed = sessionStorage.getItem(KEY) === "1"; } catch { /* sin almacenamiento */ }
    if (closed) return;
    const t = setTimeout(() => setBubble(true), 4000);
    return () => clearTimeout(t);
  }, []);

  if (pathname.startsWith("/checkout")) return null;

  const close = () => {
    setBubble(false);
    try { sessionStorage.setItem(KEY, "1"); } catch { /* sin almacenamiento */ }
  };

  return (
    <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-30 flex items-end gap-3">
      {bubble && (
        <div role="status" className="relative max-w-[230px] rounded-2xl bg-[#1a1a1a]/85 backdrop-blur-md border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.3)] px-4 py-3 text-white animate-[wa-in_.35s_ease-out]">
          <button type="button" onClick={close} className="absolute top-1.5 right-2 text-white/60 hover:text-white text-sm leading-none p-1" aria-label="Cerrar aviso">×</button>
          <p className="text-[#1de03c] font-semibold text-sm pr-4">¿Tenés dudas?</p>
          <p className="text-[13px] text-white/85 leading-snug mt-1">Hay un asesor para ayudarte a elegir tu fragancia o responder cualquier consulta.</p>
        </div>
      )}
      <a
        href={href}
        target="_blank"
        rel="noopener"
        onClick={close}
        className="grid place-items-center size-14 rounded-full bg-[#1de03c] text-[#06140a] shadow-[0_6px_20px_rgba(29,224,60,0.45)] hover:scale-105 transition shrink-0"
        aria-label="Escribinos por WhatsApp"
      >
        <WhatsIcon className="size-7" />
      </a>
    </div>
  );
}
