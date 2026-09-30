"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cleanProductName } from "@/lib/format";

const input = "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#17a930] focus:ring-2 focus:ring-[#1de03c]/30 disabled:bg-gray-50";
const label = "block text-sm font-medium text-gray-700 mb-1";
type Hit = { id: string; slug: string; name: string; brandSlug: string; brandName: string };

export default function RequestForm({ withImage }: { withImage: boolean }) {
  const [f, setF] = useState({ fullName: "", phone: "", product: "", details: "", unknown: false });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ code: string; product: string } | null>(null);

  // Mientras escribe el nombre, se fija si ya lo tenemos en la tienda.
  useEffect(() => {
    const q = f.product.trim();
    if (f.unknown || q.length < 3) return;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        setHits(((await res.json()) as Hit[]).slice(0, 3));
      } catch { setHits([]); }
    }, 350);
    return () => clearTimeout(t);
  }, [f.product, f.unknown]);

  function pickFile(fl: File | null) {
    setError("");
    if (preview) URL.revokeObjectURL(preview);
    if (fl && fl.size > 4 * 1024 * 1024) { setError("La imagen supera los 4 MB. Elegí una más liviana."); setFile(null); setPreview(""); return; }
    setFile(fl);
    setPreview(fl ? URL.createObjectURL(fl) : "");
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSending(true);
    const body = new FormData();
    body.set("fullName", f.fullName);
    body.set("phone", f.phone);
    body.set("product", f.product);
    body.set("details", f.details);
    body.set("unknown", f.unknown ? "1" : "0");
    body.set("website", (e.currentTarget.elements.namedItem("website") as HTMLInputElement).value);
    if (file) body.set("image", file);
    try {
      const res = await fetch("/api/pedido-perfume", { method: "POST", body });
      const data = await res.json();
      if (data.code) setDone({ code: data.code, product: f.unknown ? "" : f.product });
      else setError(data.error ?? "No se pudo enviar. Probá de nuevo.");
    } catch {
      setError("No se pudo enviar. Revisá tu conexión.");
    }
    setSending(false);
  }

  if (done) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center shadow-[0_8px_30px_rgba(0,0,0,0.08)]" role="status">
        <div className="mx-auto grid place-items-center size-14 rounded-full bg-[#eafbe9] text-[#17a930] text-2xl">✓</div>
        <h2 className="text-xl font-semibold text-gray-900 mt-4">¡Recibimos tu pedido!</h2>
        <p className="text-gray-500 mt-2">Tu número de pedido es <strong className="text-gray-900 tracking-wide">{done.code}</strong>. Te escribimos por WhatsApp con el precio y la demora.</p>
        <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
          <Link href="/" className="rounded-full bg-[#111] text-white font-semibold px-6 py-3">Seguir mirando la tienda</Link>
          <button type="button" onClick={() => { setDone(null); setF({ ...f, product: "", details: "", unknown: false }); pickFile(null); }} className="rounded-full border border-gray-200 px-6 py-3 font-medium text-gray-700">Pedir otro perfume</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-3xl bg-white p-5 sm:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.08)] space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Pedí tu perfume</h2>
      <div>
        <label htmlFor="pp-product" className={label}>¿Qué perfume buscás?</label>
        <input id="pp-product" value={f.product} disabled={f.unknown} required={!f.unknown} maxLength={160}
          onChange={(e) => { setF({ ...f, product: e.target.value }); if (e.target.value.trim().length < 3) setHits([]); }}
          placeholder={f.unknown ? "Describilo abajo en los detalles" : "Ej: Jean Paul Gaultier Le Male Elixir"} className={input} autoComplete="off" />
        <label className="mt-2 flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={f.unknown} onChange={(e) => { setF({ ...f, unknown: e.target.checked }); if (e.target.checked) setHits([]); }} className="size-4 accent-[#17a930]" />
          No sé el nombre exacto
        </label>
        {hits.length > 0 && !f.unknown && (
          <div className="mt-3 rounded-2xl border border-[#1de03c]/40 bg-[#f3fdf4] p-3" role="status">
            <p className="text-sm font-medium text-[#128a27]">¡Puede que ya lo tengamos!</p>
            <ul className="mt-1.5 space-y-1">
              {hits.map((h) => (
                <li key={h.id}><Link href={`/marcas/${h.brandSlug}/${h.slug}`} className="text-sm text-gray-800 underline decoration-[#1de03c] underline-offset-2 hover:text-[#17a930]">{h.brandName} {cleanProductName(h.name, h.brandName)} →</Link></li>
              ))}
            </ul>
            <p className="text-xs text-gray-500 mt-1.5">Si no es el que buscás, seguí con el pedido.</p>
          </div>
        )}
      </div>
      <div>
        <label htmlFor="pp-details" className={label}>Detalles {f.unknown ? "" : <span className="font-normal text-gray-400">(opcional)</span>}</label>
        <textarea id="pp-details" rows={3} maxLength={500} required={f.unknown} value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })}
          placeholder="Tamaño, si lo querés en decant, a qué huele, dónde lo sentiste…" className={input} />
        <p className="text-xs text-gray-400 text-right">{f.details.length}/500</p>
      </div>
      {withImage && (
        <div>
          <span className={label}>Foto del perfume <span className="font-normal text-gray-400">(opcional)</span></span>
          <label className="flex items-center gap-3 rounded-xl border border-dashed border-gray-300 px-4 py-3 cursor-pointer hover:border-[#17a930]">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- vista previa local
              <img src={preview} alt="Foto elegida" className="size-14 rounded-lg object-cover" />
            ) : <span className="grid place-items-center size-14 rounded-lg bg-gray-100 text-gray-400 text-xl" aria-hidden="true">+</span>}
            <span className="text-sm text-gray-600">{file ? file.name : "Elegí una foto (JPG, PNG o WEBP, hasta 4 MB)"}</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
          </label>
          {file && <button type="button" onClick={() => pickFile(null)} className="text-xs text-gray-500 underline mt-1">Quitar foto</button>}
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label htmlFor="pp-name" className={label}>Tu nombre</label><input id="pp-name" required maxLength={120} value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} autoComplete="name" className={input} /></div>
        <div><label htmlFor="pp-phone" className={label}>Tu WhatsApp</label><input id="pp-phone" type="tel" required maxLength={40} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} autoComplete="tel" placeholder="Ej: 362 4123456" className={input} /></div>
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button disabled={sending} className="w-full bg-[#1de03c] text-[#06140a] font-semibold rounded-full py-3.5 hover:bg-[#17a930] transition disabled:opacity-50">{sending ? "Enviando…" : "Pedir cotización"}</button>
      <p className="text-xs text-gray-400 text-center">Te respondemos por WhatsApp. Pedir una cotización no te compromete a comprar.</p>
    </form>
  );
}
