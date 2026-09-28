// Envío de mails con Resend (misma implementación que el panel). Sin configuración, no falla: queda "omitido".
import { prisma } from "@/lib/prisma";

type Mail = { to: string; subject: string; html: string; text: string; template: string; orderId?: string | null; replyTo?: string };

export const mailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);

export async function sendMail(m: Mail): Promise<{ ok: boolean; error?: string }> {
  let status = "enviado";
  let error: string | undefined;
  if (!mailConfigured()) {
    status = "omitido";
    error = "Mail no configurado (RESEND_API_KEY / MAIL_FROM)";
  } else {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: process.env.MAIL_FROM, to: [m.to], subject: m.subject, html: m.html, text: m.text, ...(m.replyTo ? { reply_to: m.replyTo } : {}) }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        status = "error";
        error = `Resend ${res.status}: ${(await res.text()).slice(0, 200)}`;
      }
    } catch (e) {
      status = "error";
      error = (e as Error).message.slice(0, 200);
    }
  }
  await prisma.notification
    .create({ data: { orderId: m.orderId ?? null, channel: "email", to: m.to, template: m.template, subject: m.subject, status, error } })
    .catch(() => {});
  return { ok: status === "enviado", error };
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Mail simple y sobrio: título, párrafos y un botón opcional. */
export function layout(title: string, paragraphs: string[], button?: { href: string; label: string }) {
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#f3f5f4;font-family:Arial,Helvetica,sans-serif;color:#1b2420">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:12px;border:1px solid #e5e9e7" cellpadding="0" cellspacing="0">
<tr><td style="padding:20px 24px;border-bottom:1px solid #e5e9e7;font-size:18px;font-weight:bold">Soko<span style="color:#15803d">Shop</span></td></tr>
<tr><td style="padding:24px"><h1 style="font-size:20px;margin:0 0 12px">${esc(title)}</h1>
${paragraphs.map((p) => `<p style="font-size:15px;line-height:1.5;margin:0 0 12px">${esc(p)}</p>`).join("")}
${button ? `<p style="margin:20px 0 4px"><a href="${esc(button.href)}" style="background:#15803d;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:bold;display:inline-block">${esc(button.label)}</a></p>` : ""}
</td></tr><tr><td style="padding:14px 24px;border-top:1px solid #e5e9e7;font-size:12px;color:#6b7872">SokoShop · Resistencia, Chaco · sokoshop.com.ar</td></tr>
</table></td></tr></table></body></html>`;
  const text = [title, "", ...paragraphs, ...(button ? ["", `${button.label}: ${button.href}`] : []), "", "SokoShop · sokoshop.com.ar"].join("\n");
  return { html, text };
}
