"use client";

import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { renderChat } from "@/lib/assistant/render";

type Card = { name: string; brand: string; url: string; image: string | null; price: number; compareAt: number | null; decantFrom: number | null; available: boolean };
type Msg = { role: "user" | "assistant"; content: string; cards?: Card[]; error?: boolean };

const STORAGE = "soko-asesor";
const WELCOME = "¡Hola! Soy el asesor virtual de SokoShop. Contame qué perfume buscás, para quién es o qué aromas te gustan, y te recomiendo opciones con precio y disponibilidad.";
const CHIPS = ["Busco algo dulce para salir de noche", "Un perfume fresco para todos los días", "Un regalo para mujer", "¿Cuánto sale el envío?", "¿Qué es un decant?"];
const peso = (n: number) => `$${n.toLocaleString("es-AR")}`;

function Spark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
      <path d="M19 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
    </svg>
  );
}

function ProductCards({ cards, onGo }: { cards: Card[]; onGo: () => void }) {
  return (
    <div className="mt-2 -mx-1 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
      {cards.map((c) => (
        <Link key={c.url} href={c.url} onClick={onGo} className="shrink-0 w-[150px] rounded-xl bg-white border border-black/10 p-2 hover:border-[#1de03c] transition">
          <div className="relative aspect-square rounded-lg bg-[#f4f4f3] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element -- ya viene redimensionada desde Cloudinary */}
            {c.image && <img src={c.image} alt="" loading="lazy" className="absolute inset-0 size-full object-contain" />}
          </div>
          <p className="mt-1.5 text-[11px] text-gray-500 truncate">{c.brand}</p>
          <p className="text-xs font-medium text-gray-900 leading-tight line-clamp-2">{c.name}</p>
          <p className="mt-1 text-xs">
            <span className="font-semibold text-gray-900">{peso(c.price)}</span>
            {c.compareAt && <span className="ml-1 text-gray-400 line-through">{peso(c.compareAt)}</span>}
          </p>
          {c.decantFrom && <p className="text-[11px] text-[#17a930]">Decant desde {peso(c.decantFrom)}</p>}
          {!c.available && <p className="text-[11px] text-gray-500">Sin stock · se puede encargar</p>}
        </Link>
      ))}
    </div>
  );
}

export default function AssistantWidget({ whatsapp }: { whatsapp: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // La charla sigue mientras dure la visita (no afecta lo que se ve antes de abrir el asesor).
  const [msgs, setMsgs] = useState<Msg[]>(() => {
    try { return JSON.parse(sessionStorage.getItem(STORAGE) ?? "[]"); } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try { sessionStorage.setItem(STORAGE, JSON.stringify(msgs.slice(-24))); } catch { /* sin almacenamiento */ }
    endRef.current?.scrollIntoView({ block: "end" });
  }, [msgs, open]);
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (pathname.startsWith("/checkout")) return null;

  async function ask(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const history: Msg[] = [...msgs.filter((m) => !m.error && m.content), { role: "user", content: q }];
    setMsgs([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    setStatus("Pensando");
    const patch = (fn: (m: Msg) => Msg) => setMsgs((all) => [...all.slice(0, -1), fn(all.at(-1)!)]);
    try {
      const res = await fetch("/api/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })), path: pathname }),
      });
      if (!res.ok || !res.body) throw new Error();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (!line) continue;
          const ev = JSON.parse(line);
          if (ev.type === "text") { setStatus(""); patch((m) => ({ ...m, content: m.content + ev.text })); }
          else if (ev.type === "tool") setStatus(ev.name === "estado_pedido" ? "Buscando tu pedido" : ev.name === "info_tienda" ? "Revisando los datos de la tienda" : "Buscando perfumes");
          else if (ev.type === "data" && Array.isArray(ev.data)) {
            patch((m) => {
              const all = [...(m.cards ?? []), ...(ev.data as Card[])];
              return { ...m, cards: all.filter((c, i) => all.findIndex((x) => x.url === c.url) === i).slice(0, 6) };
            });
          } else if (ev.type === "error") patch((m) => ({ ...m, content: (m.content ? m.content + "\n\n" : "") + ev.message, error: !m.content }));
        }
      }
    } catch {
      patch((m) => ({ ...m, content: `No pude conectarme. Probá de nuevo o escribinos por [WhatsApp](${whatsapp}).`, error: true }));
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    ask(input);
  }
  // Los links internos de las respuestas navegan sin recargar la página.
  function onAnswerClick(e: MouseEvent<HTMLDivElement>) {
    const a = (e.target as HTMLElement).closest("a");
    const href = a?.getAttribute("href");
    if (a && href?.startsWith("/") && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      router.push(href);
      if (window.innerWidth < 768) setOpen(false);
    }
  }
  const onGo = () => { if (window.innerWidth < 768) setOpen(false); };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          data-floating="asesor"
          className="fixed z-30 right-4 bottom-[5.5rem] md:right-6 md:bottom-[6.5rem] flex items-center gap-2 rounded-full bg-black text-white pl-3 pr-4 h-12 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.5)] border border-white/10 hover:bg-[#111] transition"
          aria-label="Abrir el asesor virtual"
        >
          <Spark className="size-5 text-[#1de03c]" />
          <span className="text-sm font-medium">Asesor</span>
        </button>
      )}
      {open && (
        <div
          role="dialog"
          aria-label="Asesor virtual de SokoShop"
          className="fixed z-40 inset-x-0 bottom-0 top-[8dvh] md:inset-auto md:right-6 md:bottom-6 md:w-[390px] md:h-[min(620px,calc(100dvh-3rem))] flex flex-col rounded-t-2xl md:rounded-2xl bg-[#fafaf9] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.45)] border border-black/10 overflow-hidden animate-[wa-in_.25s_ease-out]"
        >
          <div className="flex items-center gap-3 bg-black text-white px-4 py-3">
            <span className="grid place-items-center size-9 rounded-full bg-[#1de03c]/15"><Spark className="size-5 text-[#1de03c]" /></span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-tight">Asesor SokoShop</p>
              <p className="text-[11px] text-white/60">Asistente con IA · respuestas al instante</p>
            </div>
            {msgs.length > 0 && !busy && (
              <button type="button" onClick={() => setMsgs([])} className="text-xs text-white/60 hover:text-white px-2 py-1">Nueva charla</button>
            )}
            <button type="button" onClick={() => setOpen(false)} className="grid place-items-center size-8 rounded-full hover:bg-white/10" aria-label="Cerrar el asesor">
              <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3" aria-live="polite">
            <div className="max-w-[88%] rounded-2xl rounded-bl-md bg-white border border-black/5 px-3.5 py-2.5 text-sm text-gray-800">{WELCOME}</div>
            {!msgs.length && (
              <div className="flex flex-wrap gap-1.5">
                {CHIPS.map((c) => (
                  <button key={c} type="button" onClick={() => ask(c)} className="rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs text-gray-700 hover:border-[#1de03c] hover:text-gray-900 transition">{c}</button>
                ))}
              </div>
            )}
            {msgs.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-md bg-[#1de03c] text-[#06140a] px-3.5 py-2 text-sm whitespace-pre-wrap">{m.content}</p>
                </div>
              ) : (
                <div key={i} className="max-w-[92%]">
                  <div onClick={onAnswerClick} className={`asesor-md rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm ${m.error ? "bg-red-50 text-red-800 border border-red-100" : "bg-white border border-black/5 text-gray-800"}`}>
                    {m.content ? <div dangerouslySetInnerHTML={{ __html: renderChat(m.content) }} /> : <span className="text-gray-500 animate-pulse">{status || "Pensando"}…</span>}
                    {m.content && busy && i === msgs.length - 1 && status && <p className="text-xs text-gray-500 mt-1.5 animate-pulse">{status}…</p>}
                  </div>
                  {m.cards && m.cards.length > 0 && <ProductCards cards={m.cards} onGo={onGo} />}
                </div>
              )
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={onSubmit} className="border-t border-black/10 bg-white p-2.5">
            <div className="flex items-center gap-2">
              <label htmlFor="asesor-q" className="sr-only">Tu consulta</label>
              <input
                ref={inputRef}
                id="asesor-q"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={1500}
                autoComplete="off"
                placeholder="Escribí tu consulta…"
                className="flex-1 h-11 rounded-full border border-black/15 bg-[#fafaf9] px-4 text-[16px] md:text-sm outline-none focus:border-[#1de03c]"
              />
              <button disabled={busy || !input.trim()} className="grid place-items-center size-11 rounded-full bg-[#1de03c] text-[#06140a] disabled:opacity-40 transition" aria-label="Enviar">
                <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true"><path d="M3.5 10h12M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
            <p className="mt-1.5 text-center text-[11px] text-gray-400">
              Asistente con IA: puede equivocarse. ¿Preferís una persona? <a href={whatsapp} target="_blank" rel="noopener" className="text-[#17a930] hover:underline">WhatsApp</a>
            </p>
          </form>
        </div>
      )}
    </>
  );
}
