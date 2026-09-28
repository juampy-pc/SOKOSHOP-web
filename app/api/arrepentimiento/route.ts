import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { layout, sendMail } from "@/lib/mail";
import { getSetting } from "@/lib/settings";

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O ni 1/I para dictarlo sin errores
const newCode = () => "ARR-" + [...randomBytes(6)].map((b) => ALPHABET[b % ALPHABET.length]).join("");

// Botón de arrepentimiento (Res. 424/2020): registra la solicitud y devuelve el código de inmediato.
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  const fullName = str(b?.fullName, 120);
  const email = str(b?.email, 120).toLowerCase();
  const phone = str(b?.phone, 40) || null;
  const docNumber = str(b?.docNumber, 20).replace(/\D/g, "") || null;
  const orderRef = str(b?.orderRef, 40).replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || null;
  const message = str(b?.message, 1000) || null;
  if (fullName.length < 3) return NextResponse.json({ error: "Escribí tu nombre y apellido." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Revisá tu mail." }, { status: 400 });

  // Freno a envíos repetidos: hasta 3 solicitudes por mail por día.
  const recent = await prisma.withdrawalRequest.count({ where: { email, createdAt: { gte: new Date(Date.now() - 86_400_000) } } });
  if (recent >= 3) return NextResponse.json({ error: "Ya recibimos tus solicitudes de hoy. Te vamos a contactar." }, { status: 429 });

  // Si el número de pedido coincide con una compra de ese mail, se vincula.
  let orderId: string | null = null;
  if (orderRef && orderRef.length >= 6) {
    const o = await prisma.order.findFirst({ where: { id: { endsWith: orderRef.slice(-6).toLowerCase() }, customerEmail: email }, select: { id: true } });
    orderId = o?.id ?? null;
  }

  let code = newCode();
  for (let i = 0; i < 3 && (await prisma.withdrawalRequest.findUnique({ where: { code } })); i++) code = newCode();
  const w = await prisma.withdrawalRequest.create({ data: { code, fullName, email, phone, docNumber, orderRef, orderId, message } });

  const [store, alerts] = await Promise.all([getSetting("tienda"), getSetting("alertas")]);
  const { html, text } = layout(`Recibimos tu solicitud ${w.code}`, [
    `Hola ${fullName.split(" ")[0]}! Registramos tu pedido de arrepentimiento de compra.`,
    `Código de identificación: ${w.code}`,
    orderRef ? `Pedido informado: ${orderRef}.` : "No indicaste número de pedido; te vamos a contactar para identificar la compra.",
    "Te contactamos dentro de las 24 horas hábiles para coordinar la devolución. Los gastos de envío de la devolución corren por nuestra cuenta.",
  ]);
  await sendMail({ to: email, subject: `Solicitud de arrepentimiento ${w.code}`, html, text, template: "arrepentimiento.recibido", orderId, replyTo: store.email || undefined }).catch(() => {});
  for (const to of alerts.emails) {
    const a = layout(`Arrepentimiento ${w.code}`, [`${fullName} · ${email}${phone ? ` · ${phone}` : ""}`, `Pedido: ${orderRef ?? "no indicado"}${orderId ? " (vinculado)" : ""}`, ...(message ? [`Mensaje: ${message}`] : [])]);
    await sendMail({ to, subject: `Nueva solicitud de arrepentimiento ${w.code}`, html: a.html, text: a.text, template: "alerta.arrepentimiento", orderId }).catch(() => {});
  }
  return NextResponse.json({ code: w.code });
}
