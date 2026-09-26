import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { prisma } from "@/lib/prisma";

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN as string,
});

// Estados desde los que un pago aprobado puede pasar la orden a pagada.
// Cualquier otro (pagado, pagado_revisar_stock, revisar_monto) significa que
// el pago ya se procesó: no se vuelve a descontar stock.
const OPEN_STATUSES = ["pendiente", "rechazado"];

// Valida la firma x-signature de Mercado Pago cuando MP_WEBHOOK_SECRET está configurado.
// https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
function hasValidSignature(req: NextRequest, dataId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true;

  const header = req.headers.get("x-signature") ?? "";
  const requestId = req.headers.get("x-request-id") ?? "";
  const parts = Object.fromEntries(
    header.split(",").map((p) => p.trim().split("=", 2) as [string, string])
  );
  if (!parts.ts || !parts.v1) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (body?.type !== "payment") {
    return NextResponse.json({ received: true });
  }

  const paymentId = String(req.nextUrl.searchParams.get("data.id") ?? body.data?.id ?? "");
  if (!paymentId) return NextResponse.json({ received: true });

  if (!hasValidSignature(req, paymentId)) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  try {
    // Nunca se confía en el cuerpo de la notificación: el estado real se consulta a MP.
    const paymentInfo = await new Payment(client).get({ id: paymentId });
    const orderId = paymentInfo.external_reference;
    if (!orderId) return NextResponse.json({ received: true });

    if (paymentInfo.status === "approved") {
      await markPaid(orderId, paymentId, paymentInfo.transaction_amount, paymentInfo.currency_id);
    } else if (paymentInfo.status === "rejected") {
      await prisma.order.updateMany({
        where: { id: orderId, status: "pendiente" },
        data: { status: "rechazado", mpPaymentId: paymentId },
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    // 500 para que Mercado Pago reintente la notificación.
    console.error("Error en webhook de Mercado Pago:", error);
    return NextResponse.json({ error: "Error procesando pago" }, { status: 500 });
  }
}

async function markPaid(
  orderId: string,
  paymentId: string,
  amount: number | undefined,
  currency: string | undefined
) {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return;

    const amountMatches = currency === "ARS" && amount === order.total;

    // Transición condicional: solo una ejecución concurrente puede "ganar" la orden.
    // Si otra notificación del mismo pago ya la procesó, count es 0 y no se toca el stock.
    const claimed = await tx.order.updateMany({
      where: { id: orderId, status: { in: OPEN_STATUSES } },
      data: { status: amountMatches ? "pagado" : "revisar_monto", mpPaymentId: paymentId },
    });
    if (claimed.count === 0 || !amountMatches) return;

    let shortage = false;
    for (const item of order.items) {
      // Decremento atómico: solo descuenta si alcanza el stock. Stock null = no se controla.
      const res = await tx.productVariant.updateMany({
        where: { id: item.productVariantId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (res.count === 0) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.productVariantId },
          select: { stock: true },
        });
        if (variant && variant.stock !== null) shortage = true;
      }
    }

    // El pago ya se cobró: no se revierte, se marca para revisión manual en el admin.
    if (shortage) {
      await tx.order.update({
        where: { id: orderId },
        data: { status: "pagado_revisar_stock" },
      });
    }
  });
}
