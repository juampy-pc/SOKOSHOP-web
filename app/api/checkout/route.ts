import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { prisma } from "@/lib/prisma";
import { parseLines, quote, QuoteError } from "@/lib/pricing";

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN as string,
});

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Del navegador se aceptan variantes, cantidades, datos de contacto/entrega y el cupón.
// Precios, descuentos y envío se calculan siempre en el servidor (lib/pricing).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const lines = parseLines(body?.items);
    if (!lines) return NextResponse.json({ error: "Carrito inválido" }, { status: 400 });

    const c = body?.customer ?? {};
    const customer = { name: str(c.name, 120), email: str(c.email, 120).toLowerCase(), phone: str(c.phone, 40) };
    if (customer.name.length < 3) return NextResponse.json({ error: "Escribí tu nombre y apellido." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) return NextResponse.json({ error: "Revisá tu mail." }, { status: 400 });
    if (customer.phone.replace(/\D/g, "").length < 8) return NextResponse.json({ error: "Revisá tu teléfono." }, { status: 400 });

    const d = body?.delivery ?? {};
    const deliveryMethod = d.method === "envio" ? "envio" : "retiro";
    const ship = { address: str(d.address, 200), city: str(d.city, 80), province: str(d.province, 60), zip: str(d.zip, 12), notes: str(d.notes, 300) };
    if (deliveryMethod === "envio") {
      if (!d.zoneId) return NextResponse.json({ error: "Elegí la zona de envío." }, { status: 400 });
      if (ship.address.length < 4 || ship.city.length < 2) return NextResponse.json({ error: "Completá la dirección de entrega." }, { status: 400 });
    }

    const q = await quote({
      lines,
      couponCode: str(body?.couponCode, 30) || null,
      deliveryMethod,
      zoneId: typeof d.zoneId === "string" ? d.zoneId : null,
      email: customer.email,
      zip: deliveryMethod === "envio" ? ship.zip : null,
    });
    if (q.couponError && str(body?.couponCode, 30)) return NextResponse.json({ error: q.couponError }, { status: 409 });
    if (deliveryMethod === "envio" && !q.zone) return NextResponse.json({ error: "La zona de envío no está disponible." }, { status: 409 });
    if (q.minOrderError) return NextResponse.json({ error: q.minOrderError }, { status: 409 });
    if (q.areaError) return NextResponse.json({ error: q.areaError }, { status: 409 });

    const order = await prisma.order.create({
      data: {
        total: q.total,
        subtotal: q.subtotal,
        discount: q.discount,
        shippingCost: q.shippingCost,
        status: "pendiente",
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        deliveryMethod,
        shippingZoneId: q.zone?.id ?? null,
        ...(deliveryMethod === "envio" ? { shipAddress: ship.address, shipCity: ship.city, shipProvince: ship.province || null, shipZip: ship.zip || null, shipNotes: ship.notes || null } : {}),
        promotionId: q.promotion?.id ?? null,
        couponCode: q.promotion?.code ?? null,
        notes: str(body?.notes, 300) || null,
        items: {
          create: q.items.map((i) => ({ productVariantId: i.variantId, productName: i.productName, variantLabel: i.variantLabel, price: i.price, quantity: i.qty, isGift: i.isGift })),
        },
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const code = order.id.slice(-6).toUpperCase();
    // Con descuento, MP recibe una sola línea con el total (no admite ítems negativos).
    // Los regalos (precio 0) no se mandan a MP: MP no acepta ítems sin precio.
    const paidItems = q.items.filter((i) => !i.isGift);
    const mpItems =
      q.discount > 0
        ? [{ id: order.id, title: `Pedido SokoShop ${code} (${paidItems.reduce((s, i) => s + i.qty, 0)} productos${q.promotion ? `, ${q.promotion.name}` : ""})`, quantity: 1, unit_price: q.total, currency_id: "ARS" }]
        : [
            ...paidItems.map((i) => ({ id: i.variantId, title: `${i.brandName} ${i.productName} — ${i.variantLabel}`, quantity: i.qty, unit_price: i.price, currency_id: "ARS" })),
            ...(q.shippingCost > 0 ? [{ id: "envio", title: `${deliveryMethod === "retiro" ? "Retiro" : "Envío"} — ${q.zone?.name ?? ""}`, quantity: 1, unit_price: q.shippingCost, currency_id: "ARS" }] : []),
          ];

    const result = await new Preference(client).create({
      body: {
        items: mpItems,
        payer: { email: customer.email, name: customer.name },
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

    await prisma.order.update({ where: { id: order.id }, data: { mpPreferenceId: result.id } });
    return NextResponse.json({ checkoutUrl: result.init_point, orderId: order.id });
  } catch (error) {
    if (error instanceof QuoteError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Error creando checkout:", error);
    return NextResponse.json({ error: "Error al crear el checkout" }, { status: 500 });
  }
}
