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

/** Link de WhatsApp de la tienda (configurable en el panel). */
export function whatsappLink(raw: string | null | undefined, text?: string) {
  const digits = (raw ?? "").replace(/\D/g, "") || "5493625249810";
  const n = digits.length === 10 ? `549${digits}` : digits;
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
