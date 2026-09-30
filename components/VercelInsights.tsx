"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

// Vercel Web Analytics (visitas) y Speed Insights (velocidad real de carga).
// No miden en desarrollo. Se activan en el panel de Vercel (Analytics y Speed Insights).
// En las páginas de retorno del pago se saca la query: Mercado Pago agrega ahí datos del pago.
function sinDatosDelPago(event: BeforeSendEvent) {
  const url = new URL(event.url);
  if (url.pathname.startsWith("/checkout")) url.search = "";
  return { ...event, url: url.toString() };
}

export default function VercelInsights() {
  return (
    <>
      <Analytics beforeSend={sinDatosDelPago} />
      <SpeedInsights />
    </>
  );
}
