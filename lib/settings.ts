// Lee la configuración que se edita en el panel (tabla Setting).
import { prisma } from "@/lib/prisma";

export type StoreInfo = { nombre: string; direccion: string; horario: string; whatsapp: string; email: string; instagram: string };
export type AlertSettings = { emails: string[]; pedidoNuevo: boolean; resumenDiario: boolean; stockUmbral: number; horasSinPreparar: number };

const DEFAULTS = {
  tienda: { nombre: "SokoShop", direccion: "García Merou 81, Resistencia, Chaco", horario: "", whatsapp: "", email: "", instagram: "" } as StoreInfo,
  alertas: { emails: [], pedidoNuevo: true, resumenDiario: true, stockUmbral: 2, horasSinPreparar: 24 } as AlertSettings,
};

export async function getSetting<K extends keyof typeof DEFAULTS>(key: K): Promise<(typeof DEFAULTS)[K]> {
  const row = await prisma.setting.findUnique({ where: { key } }).catch(() => null);
  return { ...DEFAULTS[key], ...((row?.value as object | null) ?? {}) } as (typeof DEFAULTS)[K];
}
