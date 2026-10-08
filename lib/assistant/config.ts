// Lee la configuración del asistente que se edita en el panel (Setting "asistente").
// El panel es el dueño de este formato (sokoshop-admin, lib/assistant/config.ts).
import { prisma } from "@/lib/prisma";
import { openSecret } from "@/lib/assistant/secret";

export type StoreAssistant = { modelo: string; instrucciones: string; maxMensajesDia: number; maxPorVisitante: number };
const MODELS = new Set(["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"]);

type Saved = { apiKeyEnc?: string | null; tienda?: Partial<StoreAssistant> & { activo?: boolean } };

async function load(): Promise<Saved> {
  const row = await prisma.setting.findUnique({ where: { key: "asistente" } }).catch(() => null);
  return (row?.value ?? {}) as Saved;
}

/** Si el asistente de la tienda está activo (para mostrar o no el botón). */
export async function storeAssistantEnabled() {
  const s = await load();
  return Boolean(s.tienda?.activo && s.apiKeyEnc);
}

/** Configuración completa con la clave descifrada, o null si está apagado o falta la clave. */
export async function storeAssistant(): Promise<(StoreAssistant & { apiKey: string }) | null> {
  const s = await load();
  if (!s.tienda?.activo || !s.apiKeyEnc) return null;
  const apiKey = openSecret(s.apiKeyEnc);
  if (!apiKey) return null;
  const t = s.tienda;
  return {
    apiKey,
    modelo: t.modelo && MODELS.has(t.modelo) ? t.modelo : "claude-opus-5-5",
    instrucciones: typeof t.instrucciones === "string" ? t.instrucciones.slice(0, 4000) : "",
    maxMensajesDia: Number(t.maxMensajesDia) > 0 ? Number(t.maxMensajesDia) : 300,
    maxPorVisitante: Number(t.maxPorVisitante) > 0 ? Number(t.maxPorVisitante) : 20,
  };
}
