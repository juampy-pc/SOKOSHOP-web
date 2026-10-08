// Markdown mínimo y seguro para las respuestas del asistente: párrafos, listas, negrita, títulos,
// tablas simples y links (solo http/https o rutas internas). Todo se escapa antes de dar formato.
// Copia del panel (sokoshop-admin, lib/assistant/render.ts): si se cambia uno, cambiar el otro.
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function inline(s: string) {
  return esc(s)
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)\s]+)\)/g, (_m, text: string, href: string) => {
      const external = href.startsWith("http");
      return `<a href="${href}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""} class="underline underline-offset-2">${text}</a>`;
    })
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, '<code class="font-mono text-[0.9em]">$1</code>');
}

export function renderChat(src: string) {
  const out: string[] = [];
  const lines = src.replace(/\r/g, "").split("\n");
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let table: string[][] = [];
  const flushPara = () => { if (para.length) out.push(`<p>${inline(para.join(" "))}</p>`); para = []; };
  const flushList = () => {
    if (list) out.push(`<${list.ordered ? "ol" : "ul"}>${list.items.map((i) => `<li>${inline(i)}</li>`).join("")}</${list.ordered ? "ol" : "ul"}>`);
    list = null;
  };
  const flushTable = () => {
    if (table.length) {
      const [head, ...body] = table;
      out.push(`<div class="chat-table"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
    }
    table = [];
  };
  const flush = () => { flushPara(); flushList(); flushTable(); };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    if (/^\|.*\|$/.test(line)) {
      flushPara(); flushList();
      if (/^\|[\s:|-]+\|$/.test(line)) continue; // separador de encabezado
      table.push(line.slice(1, -1).split("|").map((c) => c.trim()));
      continue;
    }
    flushTable();
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) { flush(); out.push(`<p class="font-semibold">${inline(h[2])}</p>`); continue; }
    const ul = /^[-*•]\s+(.*)$/.exec(line);
    const ol = /^\d+[.)]\s+(.*)$/.exec(line);
    if (ul || ol) {
      flushPara();
      const ordered = Boolean(ol);
      if (list && list.ordered !== ordered) flushList();
      list ??= { ordered, items: [] };
      list.items.push((ul ?? ol)![1]);
      continue;
    }
    flushList();
    para.push(line);
  }
  flush();
  return out.join("");
}
