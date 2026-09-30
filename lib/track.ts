// Estadísticas propias, anónimas: sin cookies ni datos personales. El id de sesión vive en
// sessionStorage (se borra al cerrar la pestaña). Respeta "No rastrear" del navegador.
import { pixel } from "./pixel";

type EventType = "view" | "product_view" | "search" | "add_to_cart" | "checkout_start";

function sessionId() {
  try {
    let id = sessionStorage.getItem("sk_sid");
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("sk_sid", id);
    }
    return id;
  } catch {
    return null;
  }
}

export function track(t: EventType, data: { pid?: string; vid?: string; q?: string; n?: number; v?: number } = {}) {
  if (typeof window === "undefined") return;
  metaEvent(t, data);
  if (navigator.doNotTrack === "1" || (navigator as { globalPrivacyControl?: boolean }).globalPrivacyControl) return;
  const body = JSON.stringify({
    t,
    p: location.pathname,
    sid: sessionId(),
    ref: document.referrer && !document.referrer.startsWith(location.origin) ? document.referrer : undefined,
    m: matchMedia("(max-width: 767px)").matches ? 1 : 0,
    ...data,
  });
  if (!navigator.sendBeacon?.("/api/events", new Blob([body], { type: "application/json" }))) {
    fetch("/api/events", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {});
  }
}

/** El mismo evento, en el formato estándar de Meta Pixel (para campañas de Facebook/Instagram). */
function metaEvent(t: EventType, d: { pid?: string; vid?: string; q?: string; v?: number }) {
  if (t === "product_view" && d.pid) pixel("ViewContent", { content_ids: [d.pid], content_type: "product" });
  else if (t === "add_to_cart") pixel("AddToCart", { content_ids: d.vid ? [d.vid] : undefined, content_type: "product", value: d.v, currency: "ARS" });
  else if (t === "checkout_start") pixel("InitiateCheckout", { value: d.v, currency: "ARS" });
  else if (t === "search" && d.q) pixel("Search", { search_string: d.q });
}
