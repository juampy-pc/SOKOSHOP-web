import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { prisma } from "@/lib/prisma";

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN as string,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.type !== "payment") {
      return NextResponse.json({ received: true });
    }

    const paymentId = body.data?.id;
    if (!paymentId) return NextResponse.json({ received: true });

    const payment = new Payment(client);
    const paymentInfo = await payment.get({ id: paymentId });

    const orderId = paymentInfo.external_reference;
    if (!orderId) return NextResponse.json({ received: true });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return NextResponse.json({ received: true });

    if (paymentInfo.status === "approved" && order.status !== "pagado") {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "pagado", mpPaymentId: String(paymentId) },
      });

      for (const item of order.items) {
        const variant = await prisma.productVariant.findUnique({
          where: { id: item.productVariantId },
        });
        if (variant?.stock !== null && variant?.stock !== undefined) {
          await prisma.productVariant.update({
            where: { id: item.productVariantId },
            data: { stock: Math.max(0, variant.stock - item.quantity) },
          });
        }
      }
    } else if (paymentInfo.status === "rejected") {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "rechazado", mpPaymentId: String(paymentId) },
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error en webhook de Mercado Pago:", error);
    return NextResponse.json({ received: true });
  }
}
