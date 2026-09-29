// Zonas de envío por código postal (sin base de datos: lo usan el checkout y el servidor).
// Las localidades de la zona son solo informativas (se muestran), no restringen.

export type ZoneArea = { postalCodes: string[] };

/** "H3500ABC", "3500", "cp 3500" → "3500". */
export function normalizeZip(zip: string) {
  return zip.match(/\d{4}/)?.[0] ?? "";
}

/** true/false si la zona tiene códigos postales cargados; null si no tiene restricción (cubre todo). */
export function zoneCovers(z: ZoneArea, zip: string): boolean | null {
  if (z.postalCodes.length === 0) return null;
  const cp = Number(normalizeZip(zip) || NaN);
  if (!Number.isFinite(cp)) return false;
  return z.postalCodes.some((c) => {
    const [a, b] = c.split("-").map(Number);
    return b ? cp >= a && cp <= b : cp === a;
  });
}

export const hasArea = (z: ZoneArea) => z.postalCodes.length > 0;
