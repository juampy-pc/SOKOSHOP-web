// Bucle de conversación con Claude (API de Anthropic) con herramientas y respuesta en streaming.
// Copia del panel (sokoshop-admin, lib/assistant/chat.ts): si se cambia uno, cambiar el otro.
import Anthropic from "@anthropic-ai/sdk";

export type ChatTurn = { role: "user" | "assistant"; content: string };
export type ChatEvent =
  | { type: "text"; text: string }
  | { type: "tool"; name: string }
  | { type: "data"; name: string; data: unknown }
  | { type: "done"; usage: { input: number; output: number; cacheRead: number } }
  | { type: "error"; message: string };

export type ToolExec = (name: string, input: unknown) => Promise<{ text: string; isError: boolean; data?: unknown }>;

type RunOptions = {
  apiKey: string;
  model: string;
  effort: "low" | "medium" | "high";
  maxTokens: number;
  system: Anthropic.Beta.BetaTextBlockParam[];
  tools: Anthropic.Beta.BetaTool[];
  history: ChatTurn[];
  exec: ToolExec;
  maxSteps?: number;
};

// Los modelos que aceptan la reserva automática ante una negativa del clasificador de seguridad.
const WITH_FALLBACK = new Set(["claude-opus-5-5", "claude-sonnet-5-5"]);

/** Historial que manda el navegador: solo texto, alternado, empezando y terminando por el usuario. */
export function cleanHistory(raw: unknown, maxTurns = 20, maxChars = 4000): ChatTurn[] | null {
  if (!Array.isArray(raw)) return null;
  const turns: ChatTurn[] = [];
  for (const m of raw.slice(-maxTurns)) {
    if (!m || typeof m !== "object") return null;
    const { role, content } = m as Record<string, unknown>;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
    const text = content.trim().slice(0, maxChars);
    if (!text) continue;
    const last = turns.at(-1);
    if (last?.role === role) last.content += `\n\n${text}`;
    else turns.push({ role, content: text });
  }
  while (turns[0]?.role === "assistant") turns.shift();
  return turns.length && turns.at(-1)!.role === "user" ? turns : null;
}

export async function* runChat(o: RunOptions): AsyncGenerator<ChatEvent> {
  const client = new Anthropic({ apiKey: o.apiKey, maxRetries: 2, timeout: 120_000 });
  const messages: Anthropic.Beta.BetaMessageParam[] = o.history.map((t) => ({ role: t.role, content: t.content }));
  const tools = o.tools.map((t) => ({ ...t, eager_input_streaming: true }));
  const usage = { input: 0, output: 0, cacheRead: 0 };
  let badJson = 0;
  let wrote = false;

  for (let step = 0; step < (o.maxSteps ?? 8); step++) {
    const stream = client.beta.messages.stream({
      model: o.model,
      max_tokens: o.maxTokens,
      system: o.system,
      tools,
      messages,
      output_config: { effort: o.effort },
      cache_control: { type: "ephemeral" },
      ...(WITH_FALLBACK.has(o.model) ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
    });

    let message: Anthropic.Beta.BetaMessage;
    let stepWrote = false;
    try {
      // Reenvía el texto a medida que llega.
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          // El texto de cada vuelta (antes y después de consultar datos) va en su propio párrafo.
          yield { type: "text", text: (wrote && !stepWrote ? "\n\n" : "") + event.delta.text };
          wrote = stepWrote = true;
        }
      }
      message = await stream.finalMessage();
      badJson = 0;
    } catch (err) {
      if (err instanceof Anthropic.APIError) throw err;
      // Entrada de herramienta ilegible: se vuelve a pedir el mismo turno (máximo 2 veces seguidas).
      if (badJson++ >= 2) throw err;
      continue;
    }

    usage.input += message.usage.input_tokens;
    usage.output += message.usage.output_tokens;
    usage.cacheRead += message.usage.cache_read_input_tokens ?? 0;

    if (message.stop_reason === "refusal") {
      yield { type: "text", text: "\n\nPerdón, con eso no puedo ayudarte." };
      break;
    }
    if (message.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: message.content });
      continue;
    }
    const calls = message.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    if (!calls.length) break;
    if (message.stop_reason === "max_tokens") {
      yield { type: "text", text: "\n\n(La respuesta quedó cortada. Probá con una pregunta más acotada.)" };
      break;
    }

    messages.push({ role: "assistant", content: message.content });
    const results = await Promise.all(
      calls.map(async (call) => {
        const r = await o.exec(call.name, call.input);
        return { call, r };
      })
    );
    for (const { call, r } of results) {
      yield { type: "tool", name: call.name };
      if (r.data !== undefined) yield { type: "data", name: call.name, data: r.data };
    }
    messages.push({
      role: "user",
      content: results.map(({ call, r }) => ({ type: "tool_result" as const, tool_use_id: call.id, content: r.text, ...(r.isError ? { is_error: true } : {}) })),
    });
    if (step === (o.maxSteps ?? 8) - 1) yield { type: "text", text: "\n\n(Llegué al máximo de consultas para una sola pregunta.)" };
  }
  yield { type: "done", usage };
}

/** Mensaje claro para errores de la API (clave inválida, sin saldo, límite, etc.). */
export function apiErrorMessage(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return "La clave de la API de Claude no es válida. Revisala en Configuración → Asistente IA.";
  if (err instanceof Anthropic.PermissionDeniedError) return "La clave de la API no tiene permiso para usar este modelo.";
  if (err instanceof Anthropic.RateLimitError) return "Se alcanzó el límite de uso de la API de Claude. Probá en un rato.";
  if (err instanceof Anthropic.BadRequestError) return "La API de Claude rechazó el pedido. Revisá que la cuenta tenga saldo en console.anthropic.com.";
  if (err instanceof Anthropic.APIError) return `La API de Claude respondió con un error (${err.status ?? "sin código"}). Probá de nuevo.`;
  return "No se pudo completar la respuesta. Probá de nuevo.";
}
