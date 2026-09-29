"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { track } from "@/lib/track";
import { normalizeZip, zoneCovers } from "@/lib/shipping";
import type { DeliveryZone, PickupPoint } from "@/lib/pricing";

type Quote = {
  subtotal: number; discount: number; shippingCost: number; total: number;
  promotion: { name: string; code: string | null; summary: string } | null;
  couponError: string | null; minOrderError: string | null; areaError: string | null;
  gift: { brandName: string; productName: string; variantLabel: string } | null;
  items: { variantId: string; price: number }[];
};
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const $ = (n: number) => `$${n.toLocaleString("es-AR")}`;
const input = "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[15px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#17a930] focus:ring-2 focus:ring-[#1de03c]/30";
const label = "block text-xs font-medium text-gray-500 mb-1";
const card = "rounded-2xl bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)]";

export default function CheckoutForm({ pickupAddress, pickupHours, zones, pickups, termsUrl }: { pickupAddress: string; pickupHours: string; zones: DeliveryZone[]; pickups: PickupPoint[]; termsUrl: string | null }) {
  const { items, ready } = useCart();
  const [customer, setCustomer] = useState({ name: "", email: "", phone: "" });
  const [method, setMethod] = useState<"retiro" | "envio">("retiro");
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [pickupId, setPickupId] = useState(pickups[0]?.id ?? "");
  const [ship, setShip] = useState({ address: "", city: "", province: "Chaco", zip: "", notes: "" });
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState("");
  const [notes, setNotes] = useState("");
  const [accept, setAccept] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);

  // Datos de contacto recordados en este navegador (para la próxima compra).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("soko-checkout-v1") ?? "null");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restaura datos guardados al montar
      if (saved?.customer) setCustomer(saved.customer);
      if (saved?.ship) setShip(saved.ship);
    } catch {
      /* ignorado */
    }
  }, []);

  const cartKey = JSON.stringify(items.map((i) => [i.variantId, i.qty]));
  const email = EMAIL.test(customer.email.trim()) ? customer.email.trim() : "";
  const zip = method === "envio" ? normalizeZip(ship.zip) : "";
  const selectedId = method === "envio" ? zoneId : pickupId || null;
  useEffect(() => {
    if (!ready || items.length === 0) return;
    const ctrl = new AbortController();
    // Pequeña espera: mail, CP y ciudad cambian mientras se escribe.
    const t = setTimeout(() => {
      fetch("/api/checkout/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: items.map((i) => ({ variantId: i.variantId, qty: i.qty })), couponCode: coupon || null, deliveryMethod: method, zoneId: selectedId, email: email || null, zip: zip || null }),
        signal: ctrl.signal,
      })
        .then(async (r) => {
          const data = await r.json();
          if (!r.ok) { setQuote(null); setQuoteError(data.error ?? "No se pudo calcular el total."); return; }
          setQuoteError("");
          setQuote(data);
        })
        .catch(() => {});
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cartKey resume los ítems
  }, [cartKey, ready, coupon, method, selectedId, email, zip]);

  // Zona según el código postal: se elige sola la que corresponde.
  const coverage = (z: DeliveryZone) => zoneCovers(z, ship.zip);
  function onZipChange(zipText: string) {
    setShip({ ...ship, zip: zipText });
    const match = zones.find((z) => zoneCovers(z, zipText) === true);
    if (match) setZoneId(match.id);
  }
  const restricted = zones.some((z) => z.postalCodes.length > 0);
  const typedArea = Boolean(normalizeZip(ship.zip));
  const matched = zones.find((z) => coverage(z) === true);
  const blocker = quote?.minOrderError ?? quote?.areaError ?? null;

  const priceOf = (variantId: string, fallback: number) => quote?.items.find((i) => i.variantId === variantId)?.price ?? fallback;

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!accept) return setError("Tenés que aceptar los términos y condiciones.");
    setPaying(true);
    try {
      localStorage.setItem("soko-checkout-v1", JSON.stringify({ customer, ship }));
    } catch {
      /* ignorado */
    }
    track("checkout_start", { v: quote?.total ?? 0 });
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ variantId: i.variantId, qty: i.qty })),
          customer,
          delivery: { method, zoneId: selectedId, ...ship },
          couponCode: coupon || null,
          notes,
        }),
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      setError(data.error ?? "No se pudo iniciar el pago. Probá de nuevo.");
    } catch {
      setError("No se pudo iniciar el pago. Revisá tu conexión y probá de nuevo.");
    }
    setPaying(false);
  }

  if (ready && items.length === 0) {
    return (
      <div className={`${card} text-center py-12`}>
        <p className="text-gray-900 font-medium mb-2">Tu carrito está vacío.</p>
        <Link href="/" className="text-[#17a930] text-sm font-medium hover:underline">Ver perfumes</Link>
      </div>
    );
  }

  return (
    <form onSubmit={pay} className="grid lg:grid-cols-[1fr_380px] gap-6 items-start">
      <div className="space-y-5">
        <section className={card} aria-labelledby="c-contacto">
          <h2 id="c-contacto" className="font-semibold text-gray-900 mb-4">Tus datos</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><label htmlFor="c-name" className={label}>Nombre y apellido</label><input id="c-name" required autoComplete="name" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} className={input} /></div>
            <div><label htmlFor="c-email" className={label}>Mail</label><input id="c-email" type="email" required autoComplete="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} className={input} /></div>
            <div><label htmlFor="c-phone" className={label}>Celular (WhatsApp)</label><input id="c-phone" type="tel" required autoComplete="tel" placeholder="362 4..." value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} className={input} /></div>
          </div>
        </section>

        <section className={card} aria-labelledby="c-entrega">
          <h2 id="c-entrega" className="font-semibold text-gray-900 mb-4">Entrega</h2>
          <div className="space-y-2" role="radiogroup" aria-labelledby="c-entrega">
            <label className={`flex gap-3 rounded-xl border p-4 cursor-pointer ${method === "retiro" ? "border-[#1de03c] bg-[#f4fdf6]" : "border-gray-200"}`}>
              <input type="radio" name="method" checked={method === "retiro"} onChange={() => setMethod("retiro")} className="mt-1 accent-[#17a930]" />
              {pickups.length === 0 ? (
                <span className="flex-1"><span className="font-medium text-gray-900">Retiro en el local</span> <span className="text-[#17a930] font-medium">· Gratis</span><span className="block text-sm text-gray-500">{pickupAddress}{pickupHours ? ` · ${pickupHours}` : ""}</span></span>
              ) : (
                <span className="flex-1"><span className="font-medium text-gray-900">Retiro en sucursal</span><span className="block text-sm text-gray-500">{pickups.length === 1 ? pickups[0].address ?? pickups[0].name : `${pickups.length} puntos de retiro`}</span></span>
              )}
            </label>
            {zones.length > 0 && (
              <label className={`flex gap-3 rounded-xl border p-4 cursor-pointer ${method === "envio" ? "border-[#1de03c] bg-[#f4fdf6]" : "border-gray-200"}`}>
                <input type="radio" name="method" checked={method === "envio"} onChange={() => setMethod("envio")} className="mt-1 accent-[#17a930]" />
                <span className="flex-1"><span className="font-medium text-gray-900">Envío a domicilio</span><span className="block text-sm text-gray-500">{restricted ? "Poné tu código postal y te mostramos tu zona." : "Elegí tu zona y completá la dirección."}</span></span>
              </label>
            )}
          </div>
          {method === "retiro" && pickups.length > 0 && (
            <div className="mt-4 grid sm:grid-cols-2 gap-2" role="radiogroup" aria-label="Punto de retiro">
              {pickups.map((p) => (
                <label key={p.id} className={`rounded-xl border p-3 cursor-pointer text-sm ${pickupId === p.id ? "border-[#1de03c] bg-[#f4fdf6]" : "border-gray-200"}`}>
                  <input type="radio" name="pickup" checked={pickupId === p.id} onChange={() => setPickupId(p.id)} className="sr-only" />
                  <span className="flex justify-between gap-2"><span className="font-medium text-gray-900">{p.name}</span><span className="text-[#17a930] font-medium">{p.price > 0 ? $(p.price) : "Gratis"}</span></span>
                  {p.address && <span className="block text-gray-600 text-xs mt-0.5">{p.address}</span>}
                  {(p.hours || p.etaText) && <span className="block text-gray-500 text-xs">{[p.hours, p.etaText].filter(Boolean).join(" · ")}</span>}
                  {p.description && <span className="block text-gray-500 text-xs">{p.description}</span>}
                  {p.minOrder && <span className="block text-gray-500 text-xs">Compra mínima {$(p.minOrder)}</span>}
                </label>
              ))}
            </div>
          )}
          {method === "envio" && (
            <div className="mt-4 space-y-3">
              <div className="grid sm:grid-cols-6 gap-3">
                <div className="sm:col-span-2"><label htmlFor="s-zip" className={label}>Código postal</label><input id="s-zip" required={restricted} autoComplete="postal-code" inputMode="numeric" value={ship.zip} onChange={(e) => onZipChange(e.target.value)} placeholder="3500" className={input} /></div>
                <div className="sm:col-span-4"><label htmlFor="s-city" className={label}>Ciudad</label><input id="s-city" required autoComplete="address-level2" value={ship.city} onChange={(e) => setShip({ ...ship, city: e.target.value })} className={input} /></div>
              </div>
              {restricted && typedArea && (
                <p className={`text-xs ${matched ? "text-[#17a930]" : "text-amber-700"}`} role="status">
                  {matched ? `Tu zona: ${matched.name}.` : "No encontramos una zona para tu código postal. Elegí la que corresponda o escribinos por WhatsApp."}
                </p>
              )}
              <div className="grid sm:grid-cols-2 gap-2" role="radiogroup" aria-label="Zona de envío">
                {zones.map((z) => {
                  const cov = typedArea ? coverage(z) : null;
                  return (
                    <label key={z.id} className={`rounded-xl border p-3 cursor-pointer text-sm ${zoneId === z.id ? "border-[#1de03c] bg-[#f4fdf6]" : "border-gray-200"} ${cov === false ? "opacity-50" : ""}`}>
                      <input type="radio" name="zone" checked={zoneId === z.id} onChange={() => setZoneId(z.id)} className="sr-only" />
                      <span className="flex justify-between gap-2"><span className="font-medium text-gray-900">{z.name}</span><span className="text-[#17a930] font-medium">{z.price > 0 ? $(z.price) : "Gratis"}</span></span>
                      {(z.description || z.etaText) && <span className="block text-gray-500 text-xs mt-0.5">{[z.description, z.etaText].filter(Boolean).join(" · ")}</span>}
                      {z.localities.length > 0 && <span className="block text-gray-500 text-xs">Llega a: {z.localities.join(", ")}</span>}
                      {z.deliveryDays && <span className="block text-gray-500 text-xs">Entregas: {z.deliveryDays}</span>}
                      {z.freeFrom && <span className="block text-gray-500 text-xs">Gratis desde {$(z.freeFrom)}</span>}
                      {z.minOrder && <span className="block text-gray-500 text-xs">Compra mínima {$(z.minOrder)}</span>}
                      {cov === false && <span className="block text-amber-700 text-xs">No llega a tu código postal</span>}
                    </label>
                  );
                })}
              </div>
              <div className="grid sm:grid-cols-6 gap-3">
                <div className="sm:col-span-4"><label htmlFor="s-addr" className={label}>Calle y número, piso/depto</label><input id="s-addr" required autoComplete="street-address" value={ship.address} onChange={(e) => setShip({ ...ship, address: e.target.value })} className={input} /></div>
                <div className="sm:col-span-2"><label htmlFor="s-prov" className={label}>Provincia</label><input id="s-prov" autoComplete="address-level1" value={ship.province} onChange={(e) => setShip({ ...ship, province: e.target.value })} className={input} /></div>
                <div className="sm:col-span-6"><label htmlFor="s-notes" className={label}>Indicaciones para la entrega (opcional)</label><input id="s-notes" value={ship.notes} onChange={(e) => setShip({ ...ship, notes: e.target.value })} placeholder="Timbre, horario, referencias" className={input} /></div>
              </div>
            </div>
          )}
        </section>

        <section className={card} aria-labelledby="c-notas">
          <h2 id="c-notas" className="font-semibold text-gray-900 mb-3">¿Algo más?</h2>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={300} placeholder="Es para regalo, preferencias, etc. (opcional)" aria-labelledby="c-notas" className={input} />
        </section>
      </div>

      <aside className={`${card} lg:sticky lg:top-24 space-y-4`} aria-labelledby="c-resumen">
        <h2 id="c-resumen" className="font-semibold text-gray-900">Tu pedido</h2>
        <ul className="space-y-3 text-sm">
          {items.map((i) => (
            <li key={i.variantId} className="flex justify-between gap-3">
              <span className="text-gray-700">{i.qty} × {i.brandName} {i.productName}<span className="block text-xs text-gray-400">{i.variantLabel}</span></span>
              <span className="font-medium text-gray-900 whitespace-nowrap">{$(priceOf(i.variantId, i.price) * i.qty)}</span>
            </li>
          ))}
          {quote?.gift && (
            <li className="flex justify-between gap-3 rounded-xl bg-[#f4fdf6] px-3 py-2 -mx-1">
              <span className="text-gray-700"><span aria-hidden="true">🎁 </span>1 × {quote.gift.brandName} {quote.gift.productName}<span className="block text-xs text-gray-500">{quote.gift.variantLabel}</span></span>
              <span className="font-medium text-[#17a930] whitespace-nowrap">Gratis</span>
            </li>
          )}
        </ul>
        {quote?.promotion && <p className="text-xs text-[#17a930] font-medium">{quote.promotion.name}: {quote.promotion.summary}{quote.promotion.code ? ` (cupón ${quote.promotion.code})` : ""}</p>}
        <div className="flex gap-2">
          <input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder="Cupón de descuento" aria-label="Cupón de descuento" className={`${input} !py-2 uppercase`} />
          <button type="button" onClick={() => setCoupon(couponInput.trim())} disabled={!couponInput.trim()} className="rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-700 hover:border-[#17a930] disabled:opacity-40">Aplicar</button>
        </div>
        {coupon && quote?.couponError && <p className="text-xs text-red-600" role="alert">{quote.couponError}</p>}
        <dl className="text-sm space-y-1.5 border-t border-gray-100 pt-3">
          <div className="flex justify-between"><dt className="text-gray-500">Subtotal</dt><dd>{quote ? $(quote.subtotal) : "…"}</dd></div>
          {quote && quote.discount > 0 && <div className="flex justify-between text-[#17a930]"><dt>{quote.promotion?.name ?? "Descuento"}{quote.promotion?.code ? ` (${quote.promotion.code})` : ""}</dt><dd>−{$(quote.discount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-gray-500">{method === "retiro" ? "Retiro" : "Envío"}</dt><dd>{!quote ? "…" : quote.shippingCost === 0 ? <span className="text-[#17a930]">Gratis</span> : $(quote.shippingCost)}</dd></div>
          <div className="flex justify-between text-lg font-semibold text-gray-900 pt-2"><dt>Total</dt><dd>{quote ? $(quote.total) : "…"}</dd></div>
        </dl>
        {quoteError && <p className="text-sm text-red-600" role="alert">{quoteError}</p>}
        {blocker && <p className="text-sm text-amber-700" role="alert">{blocker}</p>}
        <label className="flex items-start gap-2 text-xs text-gray-500">
          <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-0.5 accent-[#17a930]" />
          <span>Acepto los {termsUrl ? <Link href={termsUrl} target="_blank" className="underline">términos y condiciones</Link> : "términos y condiciones"} y la <Link href="/legales/privacidad" target="_blank" className="underline">política de privacidad</Link>.</span>
        </label>
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        <button disabled={paying || !quote || Boolean(quoteError) || Boolean(blocker)} className="w-full bg-[#1de03c] text-[#06140a] font-semibold rounded-full py-3.5 shadow-[0_2px_10px_rgba(29,224,60,0.3)] hover:bg-[#17a930] transition disabled:opacity-50">
          {paying ? "Redirigiendo a Mercado Pago…" : `Pagar ${quote ? $(quote.total) : ""} con Mercado Pago`}
        </button>
        <p className="text-xs text-gray-400 text-center">Pago seguro con Mercado Pago: tarjetas, dinero en cuenta y más.</p>
      </aside>
    </form>
  );
}
