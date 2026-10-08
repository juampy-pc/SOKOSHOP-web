// Chat del asistente de la tienda (clientes). Responde en streaming, una línea JSON por evento.
// Límites para cuidar el gasto: por visitante por hora y total por día (se configuran en el panel).
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { storeAssistant } from "@/lib/assistant/config";
import { cleanHistory, runChat, type ChatEvent } from "@/lib/assistant/chat";
import { storeSystem } from "@/lib/assistant/prompt";
import { runStoreTool, storeToolDefs } from "@/lib/assistant/tools";
import { getSetting } from "@/lib/settings";
import { whatsappLink } from "@/lib/nav-config";

export const maxDuration = 60;

const BOT = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse/i;
const OFFSET = 3 * 3600_000;
const startOfDayAR = () => {
  const local = new Date(Date.now() - OFFSET);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) + OFFSET);
};
// En las preguntas guardadas no quedan mails ni números largos (documentos, teléfonos).
const mask = (s: string) => s.replace(/\S+@\S+\.\S+/g, "[mail]").replace(/\d[\d\s.-]{6,}\d/g, "[número]").slice(0, 300);

function reply(message: string, status = 200) {
  return new Response(JSON.stringify({ type: "text", text: message }) + "\n" + JSON.stringify({ type: "done", usage: { input: 0, output: 0, cacheRead: 0 } }) + "\n", {
    status,
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin && origin !== process.env.NEXT_PUBLIC_SITE_URL) {
    return Response.json({ error: "Origen no permitido" }, { status: 403 });
  }
  if (BOT.test(req.headers.get("user-agent") ?? "")) return new Response(null, { status: 204 });

  const cfg = await storeAssistant();
  if (!cfg) return Response.json({ error: "El asistente no está disponible." }, { status: 404 });

  const raw = await req.text();
  if (raw.length > 30_000) return Response.json({ error: "Mensaje demasiado largo" }, { status: 413 });
  let body: { messages?: unknown; path?: unknown };
  try { body = JSON.parse(raw); } catch { return Response.json({ error: "JSON inválido" }, { status: 400 }); }
  const history = cleanHistory(body.messages, 12, 1500);
  if (!history) return Response.json({ error: "Mensaje inválido" }, { status: 400 });
  const path = typeof body.path === "string" && body.path.startsWith("/") ? body.path.slice(0, 200) : null;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  const visitor = "as_" + createHash("sha256").update(`${ip}|${process.env.REVALIDATE_SECRET ?? ""}`).digest("base64url").slice(0, 20);
  const [perVisitor, today] = await Promise.all([
    prisma.analyticsEvent.count({ where: { type: "assistant", sessionId: visitor, createdAt: { gte: new Date(Date.now() - 3600_000) } } }),
    prisma.analyticsEvent.count({ where: { type: "assistant", createdAt: { gte: startOfDayAR() } } }),
  ]);
  if (perVisitor >= cfg.maxPorVisitante || today >= cfg.maxMensajesDia) {
    const store = await getSetting("tienda");
    return reply(`Ahora no puedo seguir respondiendo por acá. Escribinos por [WhatsApp](${whatsappLink(store.whatsapp, "Hola SokoShop! Tengo una consulta.")}) y te atendemos enseguida.`);
  }
  const event = await prisma.analyticsEvent.create({ data: { type: "assistant", sessionId: visitor, path, query: mask(history.at(-1)!.content) } });

  const system = await storeSystem(cfg.instrucciones, path ?? undefined);
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: ChatEvent) => {
        try { controller.enqueue(encoder.encode(JSON.stringify(e) + "\n")); } catch { /* la persona cerró la conexión */ }
      };
      let tools = 0;
      let tokens = 0;
      try {
        for await (const ev of runChat({
          apiKey: cfg.apiKey,
          model: cfg.modelo,
          effort: "low",
          maxTokens: 4000,
          system,
          tools: storeToolDefs(),
          history,
          exec: (name, input) => runStoreTool(name, input),
          maxSteps: 5,
        })) {
          if (ev.type === "tool") tools++;
          if (ev.type === "done") tokens = ev.usage.input + ev.usage.output;
          send(ev);
        }
      } catch (err) {
        console.error("asistente de la tienda", err);
        const store = await getSetting("tienda").catch(() => null);
        send({ type: "error", message: `Uy, no pude responder ahora. Probá de nuevo en un ratito o escribinos por [WhatsApp](${whatsappLink(store?.whatsapp, "Hola SokoShop! Tengo una consulta.")}).` });
      }
      try { controller.close(); } catch { /* ya cerrada */ }
      await prisma.analyticsEvent.update({ where: { id: event.id }, data: { results: tools, value: tokens } }).catch(() => {});
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
