"use client";

import { useState } from "react";

const input = "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#17a930] focus:ring-2 focus:ring-[#1de03c]/30";
const label = "block text-xs font-medium text-gray-500 mb-1";

export default function WithdrawalForm() {
  const [f, setF] = useState({ fullName: "", email: "", phone: "", docNumber: "", orderRef: "", message: "" });
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      const res = await fetch("/api/arrepentimiento", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const data = await res.json();
      if (data.code) setCode(data.code);
      else setError(data.error ?? "No se pudo enviar. Probá de nuevo.");
    } catch {
      setError("No se pudo enviar. Revisá tu conexión.");
    }
    setSending(false);
  }

  if (code) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-[0_2px_16px_rgba(0,0,0,0.05)]" role="status">
        <p className="text-gray-500 text-sm">Recibimos tu solicitud. Tu código de identificación es</p>
        <p className="text-3xl font-bold tracking-wider text-gray-900 my-3">{code}</p>
        <p className="text-gray-500 text-sm">Te lo mandamos también por mail. Guardalo: con ese código podés consultar el estado. Te contactamos dentro de las 24 horas hábiles.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl bg-white p-6 shadow-[0_2px_16px_rgba(0,0,0,0.05)] space-y-3">
      <div><label htmlFor="w-name" className={label}>Nombre y apellido *</label><input id="w-name" required value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} autoComplete="name" className={input} /></div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label htmlFor="w-email" className={label}>Mail de la compra *</label><input id="w-email" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" className={input} /></div>
        <div><label htmlFor="w-phone" className={label}>Teléfono</label><input id="w-phone" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} autoComplete="tel" className={input} /></div>
        <div><label htmlFor="w-order" className={label}>Número de pedido</label><input id="w-order" value={f.orderRef} onChange={(e) => setF({ ...f, orderRef: e.target.value })} placeholder="Ej: 3LU1DE" className={input} /></div>
        <div><label htmlFor="w-dni" className={label}>DNI</label><input id="w-dni" inputMode="numeric" value={f.docNumber} onChange={(e) => setF({ ...f, docNumber: e.target.value })} className={input} /></div>
      </div>
      <div><label htmlFor="w-msg" className={label}>Comentario (opcional)</label><textarea id="w-msg" rows={3} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} className={input} /></div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button disabled={sending} className="w-full bg-[#1de03c] text-[#06140a] font-semibold rounded-full py-3 hover:bg-[#17a930] transition disabled:opacity-50">{sending ? "Enviando…" : "Enviar solicitud de arrepentimiento"}</button>
    </form>
  );
}
