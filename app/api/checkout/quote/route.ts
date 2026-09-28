import { NextRequest, NextResponse } from "next/server";
import { parseLines, quote, QuoteError } from "@/lib/pricing";

// Cotización para mostrar en el checkout (no crea el pedido).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const lines = parseLines(body?.items);
  if (!lines) return NextResponse.json({ error: "Carrito inválido" }, { status: 400 });
  try {
    const q = await quote({
      lines,
      couponCode: typeof body.couponCode === "string" ? body.couponCode.slice(0, 30) : null,
      deliveryMethod: body.deliveryMethod === "envio" || body.deliveryMethod === "retiro" ? body.deliveryMethod : null,
      zoneId: typeof body.zoneId === "string" ? body.zoneId : null,
    });
    return NextResponse.json({
      subtotal: q.subtotal, discount: q.discount, shippingCost: q.shippingCost, total: q.total,
      promotion: q.promotion ? { name: q.promotion.name, code: q.promotion.code } : null,
      couponError: q.couponError, zones: q.zones,
      items: q.items.map((i) => ({ variantId: i.variantId, price: i.price, qty: i.qty })),
    });
  } catch (e) {
    if (e instanceof QuoteError) return NextResponse.json({ error: e.message }, { status: 409 });
    console.error("quote", e);
    return NextResponse.json({ error: "No se pudo calcular el total." }, { status: 500 });
  }
}
