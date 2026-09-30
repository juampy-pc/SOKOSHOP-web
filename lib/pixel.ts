// Meta Pixel (Facebook/Instagram Ads). El código base se carga en components/MetaPixel.tsx;
// acá están los eventos estándar que usa la tienda.
export const META_PIXEL_ID = "4205361862932176";

type Fbq = (cmd: "track" | "init", event: string, params?: Record<string, unknown>, opts?: { eventID?: string }) => void;

export function pixel(event: string, params?: Record<string, unknown>, eventID?: string) {
  if (typeof window === "undefined") return;
  const fbq = (window as unknown as { fbq?: Fbq }).fbq;
  if (!fbq) return;
  try {
    fbq("track", event, params, eventID ? { eventID } : undefined);
  } catch {
    /* el pixel nunca debe romper la tienda */
  }
}
