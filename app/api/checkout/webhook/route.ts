import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { prisma } from "@/lib/prisma";
import { flagMpRefund, markPaid } from "@/lib/orders";
import { sendOrderEmails, sendRefundAlert } from "@/lib/notify";

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN as string,
});

// Valida la firma x-signature de Mercado Pago cuando MP_WEBHOOK_SECRET está configurado.
// https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
function hasValidSignature(req: NextRequest, dataId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    // Sin secreto no se puede verificar la firma. Igual se procesa (el estado real siempre se consulta a MP),
    // pero queda el error en los logs para que se configure.
    if (process.env.NODE_ENV === "production") console.error("Falta MP_WEBHOOK_SECRET: el webhook de Mercado Pago no verifica la firma.");
    return true;
  }

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
      const { paidNow } = await markPaid(orderId, paymentId, paymentInfo.transaction_amount, paymentInfo.currency_id);
      revalidatePath("/", "layout"); // el stock cambió: refrescar la caché de la tienda
      // Mails solo la primera vez (MP repite notificaciones). Un error de mail no hace fallar el webhook.
      if (paidNow) await sendOrderEmails(orderId).catch((e) => console.error("Mails del pedido:", e));
    } else if (paymentInfo.status === "rejected" || paymentInfo.status === "cancelled") {
      await prisma.order.updateMany({
        where: { id: orderId, status: "pendiente" },
        data: { status: "rechazado", mpPaymentId: paymentId },
      });
    } else if (paymentInfo.status === "refunded" || paymentInfo.status === "charged_back") {
      // Devuelto desde Mercado Pago: se anota y se avisa una sola vez; la devolución se registra en el panel.
      if (await flagMpRefund(orderId, paymentId, paymentInfo.status)) {
        await sendRefundAlert(orderId, paymentInfo.status).catch((e) => console.error("Aviso de reintegro:", e));
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    // 500 para que Mercado Pago reintente la notificación.
    console.error("Error en webhook de Mercado Pago:", error);
    return NextResponse.json({ error: "Error procesando pago" }, { status: 500 });
  }
}
