"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { META_PIXEL_ID, pixel } from "@/lib/pixel";

// Código base de Meta Pixel. Se carga después de que la página es interactiva (no frena la carga)
// y registra un PageView en la primera visita y en cada cambio de página (la tienda navega sin recargar).
export default function MetaPixel() {
  const path = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; } // el primero lo manda el código base
    pixel("PageView");
  }, [path]);

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');`}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element -- píxel de seguimiento sin JavaScript */}
        <img height="1" width="1" style={{ display: "none" }} alt="" src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`} />
      </noscript>
    </>
  );
}

/** Compra confirmada (página de éxito). Se manda una sola vez por pedido aunque recarguen la página. */
export function PixelPurchase({ orderId, value }: { orderId: string; value: number }) {
  useEffect(() => {
    const key = `sk_px_${orderId}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch { /* sin almacenamiento: se manda igual */ }
    pixel("Purchase", { value, currency: "ARS" }, orderId); // espera sola a que cargue el pixel
  }, [orderId, value]);
  return null;
}
