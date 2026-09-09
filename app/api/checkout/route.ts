import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { prisma } from "@/lib/prisma";

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN as string,
});

type CartItem = {
  variantId: string;
  productName: string;
  brandName: string;
  variantLabel: string;
  price: number;
  qty: number;
};

export async function POST(req: NextRequest) {
  try {
    const { items }: { items: CartItem[] } = await req.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Carrito vacío" }, { status: 400 });
    }

    const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);

    const order = await prisma.order.create({
      data: {
        total,
        status: "pendiente",
        items: {
          create: items.map((i) => ({
            productVariantId: i.variantId,
            productName: i.productName,
            variantLabel: i.variantLabel,
            price: i.price,
            quantity: i.qty,
          })),
        },
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        items: items.map((i) => ({
          id: i.variantId,
          title: `${i.brandName} ${i.productName} — ${i.variantLabel}`,
          quantity: i.qty,
          unit_price: i.price,
          currency_id: "ARS",
        })),
        external_reference: order.id,
        back_urls: {
          success: `${baseUrl}/checkout/exito`,
          failure: `${baseUrl}/checkout/error`,
          pending: `${baseUrl}/checkout/pendiente`,
        },
        auto_return: "approved",
        notification_url: `${baseUrl}/api/checkout/webhook`,
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { mpPreferenceId: result.id },
    });

    return NextResponse.json({ checkoutUrl: result.init_point });
  } catch (error) {
    console.error("Error creando checkout:", error);
    return NextResponse.json({ error: "Error al crear el checkout" }, { status: 500 });
  }
}
