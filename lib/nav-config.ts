// Configuración del menú (sin base de datos: la usan también componentes del navegador).
import { originPages } from "@/lib/origin-pages";

export const GENDER_PAGES = {
  femenino: { slug: "perfumes-femeninos", title: "Perfumes femeninos", menu: "Femeninos", intro: "Fragancias pensadas para ella: florales, frutales, dulces y más." },
  masculino: { slug: "perfumes-masculinos", title: "Perfumes masculinos", menu: "Masculinos", intro: "Fragancias pensadas para él: frescas, amaderadas, especiadas y más." },
  unisex: { slug: "perfumes-unisex", title: "Perfumes unisex", menu: "Unisex", intro: "Fragancias para usar sin etiquetas, sean para vos o para regalar." },
} as const;
export type Gender = keyof typeof GENDER_PAGES;

/** Cómo se muestra cada origen en el menú (independiente = "Alternativas"). */
export const ORIGIN_MENU: { origin: keyof typeof originPages; label: string }[] = [
  { origin: "disenador", label: "Diseñador" },
  { origin: "arabe", label: "Árabes" },
  { origin: "nicho", label: "Nicho" },
  { origin: "independiente", label: "Alternativas" },
];

export type NavBrand = { slug: string; name: string };
export type NavGroup = { origin: string; label: string; href: string; brands: NavBrand[] };

/**
 * Número argentino en el formato de wa.me (549 + área + número, sin 0 ni 15). Igual que en el panel
 * (sokoshop-admin/lib/settings.ts): así también funcionan los números que se guardaron antes con 0 o 15.
 */
export function normalizeWhatsapp(raw: string): string | null {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("549") && d.length === 13) return d;
  if (d.startsWith("54") && d.length === 12) return `549${d.slice(2)}`;
  if (d.startsWith("54") && d.length === 14 && d.slice(2).match(/^\d{2,4}15/)) d = d.slice(2);
  d = d.replace(/^0/, "");
  if (d.length === 12) for (const area of [2, 3, 4]) if (d.slice(area, area + 2) === "15") { d = d.slice(0, area) + d.slice(area + 2); break; }
  return d.length === 10 ? `549${d}` : null;
}

/** Link de WhatsApp de la tienda (configurable en el panel). */
export function whatsappLink(raw: string | null | undefined, text?: string) {
  const n = normalizeWhatsapp(raw ?? "") ?? "5493625249810";
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
