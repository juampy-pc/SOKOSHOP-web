// Markdown mínimo y seguro para textos legales: títulos (#, ##), listas (-), negrita (**) y párrafos.
// Todo se escapa antes de dar formato: no se puede inyectar HTML.
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const inline = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

export function renderMarkdown(src: string) {
  const out: string[] = [];
  let list: string[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) out.push(`<p>${inline(para.join(" "))}</p>`);
    if (list.length) out.push(`<ul>${list.map((l) => `<li>${inline(l)}</li>`).join("")}</ul>`);
    para = [];
    list = [];
  };
  for (const raw of src.replace(/\r/g, "").split("\n")) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) { flush(); const lvl = Math.min(3, h[1].length + 1); out.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`); continue; }
    const li = /^[-*]\s+(.*)$/.exec(line);
    if (li) { if (para.length) { out.push(`<p>${inline(para.join(" "))}</p>`); para = []; } list.push(li[1]); continue; }
    if (list.length) { out.push(`<ul>${list.map((l) => `<li>${inline(l)}</li>`).join("")}</ul>`); list = []; }
    para.push(line);
  }
  flush();
  return out.join("\n");
}
