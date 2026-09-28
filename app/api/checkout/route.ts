import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { prisma } from "@/lib/prisma";
import { cleanProductName } from "@/lib/format";

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN as string,
});

const MAX_QTY_PER_ITEM = 10;
const MAX_LINES = 30;

const typeLabel: Record<string, string> = {
  decant: "Decant",
  frasco_completo: "Frasco completo",
  body_splash: "Body Splash",
};

// Del cliente solo se acepta qué variante y cuántas unidades.
// Precio, nombre y etiqueta se leen siempre de la base.
type CartLine = { variantId: string; qty: number };

function parseLines(body: unknown): CartLine[] | null {
  const items = (body as { items?: unknown })?.items;
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_LINES) return null;

  const merged = new Map<string, number>();
  for (const raw of items) {
    const variantId = (raw as { variantId?: unknown })?.variantId;
    const qty = (raw as { qty?: unknown })?.qty;
    if (typeof variantId !== "string" || variantId.length === 0 || variantId.length > 64) return null;
    if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1) return null;
    merged.set(variantId, (merged.get(variantId) ?? 0) + qty);
  }
  for (const qty of merged.values()) if (qty > MAX_QTY_PER_ITEM) return null;

  return [...merged].map(([variantId, qty]) => ({ variantId, qty }));
}

export async function POST(req: NextRequest) {
  try {
    const lines = parseLines(await req.json().catch(() => null));
    if (!lines) {
      return NextResponse.json({ error: "Carrito inválido" }, { status: 400 });
    }

    const variants = await prisma.productVariant.findMany({
      where: { id: { in: lines.map((l) => l.variantId) } },
      include: { product: { include: { brand: true } } },
    });
    const byId = new Map(variants.map((v) => [v.id, v]));

    const priced = [];
    for (const line of lines) {
      const v = byId.get(line.variantId);
      if (!v || v.product.status !== "publicado") {
        return NextResponse.json(
          { error: "Un producto del carrito ya no está disponible" },
          { status: 409 }
        );
      }
      if (v.stock !== null && v.stock < line.qty) {
        return NextResponse.json(
          { error: `Stock insuficiente para ${v.product.name}` },
          { status: 409 }
        );
      }
      const productName = cleanProductName(v.product.name, v.product.brand.name);
      priced.push({
        variantId: v.id,
        brandName: v.product.brand.name,
        productName,
        variantLabel: `${typeLabel[v.type] ?? v.type}${v.sizeMl ? ` ${v.sizeMl}ml` : ""}`,
        price: v.price,
        qty: line.qty,
      });
    }

    const total = priced.reduce((sum, i) => sum + i.price * i.qty, 0);

    const order = await prisma.order.create({
      data: {
        total,
        status: "pendiente",
        items: {
          create: priced.map((i) => ({
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
        items: priced.map((i) => ({
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
