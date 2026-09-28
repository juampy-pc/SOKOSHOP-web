import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TYPES = new Set(["view", "product_view", "search", "add_to_cart", "checkout_start"]);
const BOT = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|pingdom|monitor/i;

// Límite simple por IP (por instancia) para que nadie llene la base de eventos.
const hits = new Map<string, { n: number; reset: number }>();
function limited(ip: string) {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || h.reset < now) {
    hits.set(ip, { n: 1, reset: now + 60_000 });
    if (hits.size > 5000) hits.clear();
    return false;
  }
  return ++h.n > 120;
}

const str = (v: unknown, max: number) => (typeof v === "string" && v.length > 0 ? v.slice(0, max) : null);
const int = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(1e9, Math.round(v))) : null);

export async function POST(req: NextRequest) {
  const ua = req.headers.get("user-agent") ?? "";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  if (BOT.test(ua) || limited(ip)) return new NextResponse(null, { status: 204 });

  let b: Record<string, unknown>;
  try {
    const text = await req.text();
    if (text.length > 2000) return new NextResponse(null, { status: 413 });
    b = JSON.parse(text);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const type = str(b.t, 20);
  if (!type || !TYPES.has(type)) return new NextResponse(null, { status: 400 });

  try {
    let productId = str(b.pid, 40);
    const variantId = str(b.vid, 40);
    if (!productId && variantId) {
      productId = (await prisma.productVariant.findUnique({ where: { id: variantId }, select: { productId: true } }))?.productId ?? null;
    }
    let referrer: string | null = null;
    const ref = str(b.ref, 500);
    if (ref) {
      try { referrer = new URL(ref).hostname.replace(/^www\./, ""); } catch { referrer = null; }
    }
    await prisma.analyticsEvent.create({
      data: {
        type,
        path: str(b.p, 200),
        productId,
        query: type === "search" ? str(b.q, 80)?.toLowerCase().trim() ?? null : null,
        results: int(b.n),
        value: int(b.v),
        sessionId: str(b.sid, 64),
        referrer,
        device: b.m === 1 ? "mobile" : "desktop",
      },
    });
  } catch (e) {
    console.error("events", e);
  }
  return new NextResponse(null, { status: 204 });
}
