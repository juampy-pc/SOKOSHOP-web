// Herramientas del asistente de la tienda: solo datos públicos del catálogo y de la tienda,
// más el estado de un pedido si la persona da el número y el mail de la compra.
// Nunca devuelven costos, márgenes, stock exacto, proveedores ni datos de otros clientes.
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";
import { salePromos } from "@/lib/sale-promos";
import { activePromoWhere } from "@/lib/promo-data";
import { describePromo } from "@/lib/promo-engine";
import { imageUrl, promoPrice, salePct, variantText, type SalePromo } from "@/lib/catalog";
import { cleanProductName } from "@/lib/format";
import { whatsappLink } from "@/lib/nav-config";

const GENDER: Record<string, string> = { masculino: "Masculino", femenino: "Femenino", unisex: "Unisex" };
const ORIGIN: Record<string, string> = { arabe: "Árabe", disenador: "Diseñador", nicho: "Nicho", independiente: "Alternativa" };
const STATUS: Record<string, string> = {
  pendiente: "Pendiente de pago", pagado: "Pagado", pagado_revisar_stock: "Pagado (lo estamos revisando)", revisar_monto: "Pagado (lo estamos revisando)",
  rechazado: "Pago rechazado", entregado: "Entregado", cancelado: "Cancelado", anulado: "Anulado",
};
const FULFILLMENT: Record<string, string> = {
  pendiente_preparar: "En preparación", preparado: "Preparado", pendiente_entrega: "En camino / por entregar", retiro_sucursal: "Listo para retirar en el local", entregado: "Entregado",
};
const like = (s: string) => ({ contains: s.trim(), mode: "insensitive" as const });

export type ProductCardData = { name: string; brand: string; url: string; image: string | null; price: number; compareAt: number | null; decantFrom: number | null; available: boolean };

const productInclude = {
  brand: true,
  variants: { orderBy: { price: "asc" }, select: { id: true, type: true, sizeMl: true, price: true, salePrice: true, stock: true } },
  images: { where: { kind: "image" }, orderBy: [{ variantId: { sort: "asc", nulls: "first" } }, { sort: "asc" }], take: 1 },
  notes: { orderBy: { order: "asc" }, include: { note: true } },
} satisfies Prisma.ProductInclude;
type Row = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

const available = (v: { type: string; stock: number | null }) => v.type === "decant" || v.stock == null || v.stock > 0;

function summarize(p: Row, promos: SalePromo[]) {
  const pct = salePct(promos, { id: p.id, brandId: p.brandId, origin: p.brand.origin });
  const variants = p.variants.map((v) => ({ ...v, ...promoPrice(v, pct) }));
  const bottles = variants.filter((v) => v.type !== "decant");
  const decants = variants.filter((v) => v.type === "decant");
  const main = bottles[0] ?? variants[0];
  const card: ProductCardData = {
    name: cleanProductName(p.name, p.brand.name),
    brand: p.brand.name,
    url: `/marcas/${p.brand.slug}/${p.slug}`,
    image: p.images[0] ? imageUrl(p.images[0].url, 160, 160) : null,
    price: main?.price ?? 0,
    compareAt: main?.compareAt ?? null,
    decantFrom: decants.length ? Math.min(...decants.map((d) => d.price)) : null,
    available: bottles.some(available) || (!bottles.length && decants.length > 0),
  };
  return {
    card,
    text: {
      nombre: `${p.brand.name} ${cleanProductName(p.name, p.brand.name)}`,
      url: card.url,
      origen: ORIGIN[p.brand.origin] ?? p.brand.origin,
      genero: p.gender ? GENDER[p.gender] ?? p.gender : null,
      familia: p.olfactiveFamily,
      notas: p.notes.slice(0, 8).map((n) => n.note.name),
      presentaciones: variants.map((v) => ({
        presentacion: variantText(v),
        precio: v.price,
        precio_anterior: v.compareAt,
        disponible: available(v) ? (v.type !== "decant" && v.stock != null && v.stock <= 2 ? "últimas unidades" : "sí") : "sin stock (se puede encargar)",
      })),
    },
  };
}

type ToolDef<S extends z.ZodObject> = { name: string; description: string; input: S; run: (i: z.output<S>) => Promise<{ text: unknown; data?: unknown }> };
const tool = <S extends z.ZodObject>(d: ToolDef<S>) => d as unknown as ToolDef<z.ZodObject>;

export const STORE_TOOLS = [
  tool({
    name: "buscar_perfumes",
    description: "Busca perfumes publicados en la tienda por nombre, marca, género, familia olfativa, nota, origen o precio. Devuelve precios actuales (con ofertas), presentaciones (frasco y decants) y disponibilidad. Usala siempre antes de recomendar o dar precios.",
    input: z.object({
      texto: z.string().max(80).optional().describe("Nombre, marca o palabras clave, ej. 'yara', 'lattafa', 'khamrah'."),
      genero: z.enum(["masculino", "femenino", "unisex"]).optional(),
      familia: z.string().max(40).optional().describe("Familia olfativa, ej. 'oriental', 'amaderada', 'floral', 'gourmand', 'cítrica', 'acuática'."),
      nota: z.string().max(40).optional().describe("Nota olfativa, ej. 'vainilla', 'oud', 'café', 'rosa'."),
      origen: z.enum(["arabe", "disenador", "nicho", "independiente"]).optional(),
      precio_max: z.number().int().positive().optional().describe("Precio máximo del frasco en pesos."),
      solo_disponibles: z.boolean().default(true),
      limite: z.number().int().min(1).max(8).default(6),
    }),
    run: async (i) => {
      const words = (i.texto ?? "").split(/\s+/).filter((w) => w.length > 1).slice(0, 5);
      const where: Prisma.ProductWhereInput = {
        status: "publicado",
        ...(i.genero ? { gender: { in: [i.genero, "unisex"] } } : {}),
        ...(i.familia ? { olfactiveFamily: like(i.familia) } : {}),
        ...(i.nota ? { notes: { some: { note: { name: like(i.nota) } } } } : {}),
        ...(i.origen ? { brand: { origin: i.origen } } : {}),
        AND: [
          ...words.map((w) => ({ OR: [{ name: like(w) }, { brand: { name: like(w) } }, { olfactiveFamily: like(w) }, { notes: { some: { note: { name: like(w) } } } }] })),
          ...(i.precio_max ? [{ variants: { some: { type: { not: "decant" }, price: { lte: i.precio_max } } } }] : []),
          ...(i.solo_disponibles ? [{ variants: { some: { OR: [{ type: "decant" }, { stock: null }, { stock: { gt: 0 } }] } } }] : []),
        ],
      };
      const [rows, promos] = await Promise.all([prisma.product.findMany({ where, include: productInclude, take: 40 }), salePromos()]);
      // Primero los de nombre o marca coincidente, después por precio.
      const score = (p: Row) => words.filter((w) => `${p.brand.name} ${p.name}`.toLowerCase().includes(w.toLowerCase())).length;
      const items = rows
        .map((p) => ({ p, s: summarize(p, promos) }))
        .sort((a, b) => score(b.p) - score(a.p) || a.s.card.price - b.s.card.price)
        .slice(0, i.limite);
      return {
        text: { encontrados: rows.length, mostrados: items.length, perfumes: items.map((x) => x.s.text) },
        data: items.map((x) => x.s.card),
      };
    },
  }),

  tool({
    name: "ver_perfume",
    description: "Ficha completa de un perfume de la tienda: descripción, pirámide olfativa (salida, corazón, fondo), concentración, año, perfumista, precios y disponibilidad de cada presentación.",
    input: z.object({ perfume: z.string().min(2).max(120).describe("Nombre (con o sin marca) o dirección /marcas/... del perfume.") }),
    run: async (i) => {
      const slug = i.perfume.split("/").filter(Boolean).pop() ?? i.perfume;
      const words = i.perfume.split(/\s+/).filter((w) => w.length > 1).slice(0, 6);
      const p =
        (await prisma.product.findFirst({ where: { slug, status: "publicado" }, include: productInclude })) ??
        (await prisma.product.findFirst({
          where: { status: "publicado", AND: words.map((w) => ({ OR: [{ name: like(w) }, { brand: { name: like(w) } }] })) },
          include: productInclude,
        }));
      if (!p) return { text: { error: "No encontré ese perfume en la tienda. Probá con buscar_perfumes o sugerí el servicio de perfumes a pedido (/perfumes-a-pedido)." } };
      const s = summarize(p, await salePromos());
      const level = (key: string) => p.notes.filter((n) => n.position === key).map((n) => n.note.name);
      return {
        text: {
          ...s.text,
          notas: undefined,
          piramide: { salida: level("salida"), corazon: level("corazon"), fondo: level("fondo"), principales: p.notes.filter((n) => !["salida", "corazon", "fondo"].includes(n.position)).map((n) => n.note.name) },
          concentracion: p.concentration,
          lanzamiento: p.launchYear,
          perfumista: p.perfumer,
          descripcion: (p.descriptionShort ?? p.descriptionLong ?? "").slice(0, 900) || null,
        },
        data: [s.card],
      };
    },
  }),

  tool({
    name: "info_tienda",
    description: "Datos del local y de la compra: dirección, horario, WhatsApp, Instagram, envíos y retiro (costos, demoras, zonas), medios de pago, promociones vigentes, decants, originalidad, perfumes a pedido y botón de arrepentimiento.",
    input: z.object({}),
    run: async () => {
      const [store, zones, promos] = await Promise.all([
        getSetting("tienda"),
        prisma.shippingZone.findMany({ where: { active: true, archivedAt: null }, orderBy: [{ sort: "asc" }, { name: "asc" }] }),
        prisma.promotion.findMany({ where: { ...activePromoWhere(), OR: [{ showBanner: true }, { showAsSale: true }] }, take: 6 }),
      ]);
      return {
        text: {
          local: { direccion: store.direccion, horario: store.horario || null, whatsapp: store.whatsapp ? whatsappLink(store.whatsapp) : null, instagram: store.instagram || null, email: store.email || null },
          envios_y_retiro: zones.map((z) => ({
            tipo: z.kind === "retiro" ? "Retiro" : "Envío",
            nombre: z.name,
            descripcion: z.description,
            costo: z.price,
            gratis_desde: z.freeFrom,
            compra_minima: z.minOrder,
            demora: z.etaText,
            dias: z.deliveryDays,
            direccion: z.address,
            horario: z.hours,
            localidades: z.localities.slice(0, 15),
          })),
          pagos: "Online con Mercado Pago (tarjetas de crédito y débito, dinero en cuenta). En el local: efectivo, transferencia, débito, crédito y Mercado Pago.",
          promociones: promos.map((p) => p.bannerText?.trim() || `${describePromo(p)}${p.code && p.showBanner ? ` con el cupón ${p.code}` : ""}`),
          originalidad: "Todos los perfumes son 100% originales: sin imitaciones ni réplicas.",
          decants: "Los decants son muestras de 5 o 10 ml fraccionadas del frasco original, para probar antes de comprar el frasco completo.",
          perfumes_a_pedido: "Si un perfume no está en la tienda se puede pedir en /perfumes-a-pedido y te pasan precio y demora por WhatsApp.",
          arrepentimiento: "Se puede cancelar la compra dentro de los 10 días corridos desde la entrega con el Botón de arrepentimiento (/arrepentimiento).",
          contacto: "/contacto",
        },
      };
    },
  }),

  tool({
    name: "estado_pedido",
    description: "Estado de un pedido de la tienda online. Pedile a la persona el número de pedido y el mail con el que compró: los dos tienen que coincidir.",
    input: z.object({ numero: z.number().int().positive(), email: z.string().email().max(160) }),
    run: async (i) => {
      const o = await prisma.order.findFirst({
        where: { number: i.numero, customerEmail: { equals: i.email.trim(), mode: "insensitive" } },
        include: { items: { select: { productName: true, variantLabel: true, quantity: true } }, shippingZone: { select: { name: true, etaText: true } } },
      });
      if (!o) return { text: { error: "No encontré un pedido con ese número y ese mail. Revisá los datos o escribí por WhatsApp." } };
      return {
        text: {
          numero: o.number,
          fecha: o.createdAt.toISOString().slice(0, 10),
          estado: STATUS[o.status] ?? o.status,
          preparacion: FULFILLMENT[o.fulfillment] ?? o.fulfillment,
          entrega: o.deliveryMethod === "retiro" ? "Retiro en el local" : o.deliveryMethod === "envio" ? `Envío${o.shippingZone ? ` (${o.shippingZone.name}${o.shippingZone.etaText ? `, ${o.shippingZone.etaText}` : ""})` : ""}` : null,
          seguimiento: o.trackingCode ? { empresa: o.trackingCarrier, codigo: o.trackingCode, link: o.trackingUrl } : null,
          total: o.total,
          productos: o.items.map((it) => `${it.quantity}× ${it.productName} (${it.variantLabel})`),
        },
      };
    },
  }),
];

export function storeToolDefs() {
  return STORE_TOOLS.map((t) => {
    const schema = z.toJSONSchema(t.input, { io: "input" }) as Record<string, unknown>;
    delete schema.$schema;
    return { name: t.name, description: t.description, input_schema: { type: "object" as const, properties: {}, ...schema } };
  });
}

export async function runStoreTool(name: string, raw: unknown): Promise<{ text: string; isError: boolean; data?: unknown }> {
  const t = STORE_TOOLS.find((x) => x.name === name);
  if (!t) return { text: `Herramienta desconocida: ${name}`, isError: true };
  const parsed = t.input.safeParse(raw ?? {});
  if (!parsed.success) return { text: `Datos inválidos: ${parsed.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`).join("; ")}`, isError: true };
  try {
    const out = await t.run(parsed.data);
    return { text: JSON.stringify(out.text), isError: false, data: out.data };
  } catch (e) {
    console.error(`asistente tienda: falló ${name}`, e);
    return { text: "No se pudo obtener la información.", isError: true };
  }
}
