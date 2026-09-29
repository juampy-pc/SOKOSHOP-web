// Motor de promociones (sin base de datos): lo usan la tienda (checkout) y el POS.
// Se aplica UNA sola promoción por compra: la que más le conviene al cliente.
// ⚠️ Copia idéntica en SOKOSHOP-web/lib/promo-engine.ts: si cambiás una, cambiá la otra.

export type PromoKind = "porcentaje" | "monto" | "envio_gratis" | "nxm" | "regalo";

export type EnginePromo = {
  id: string;
  name: string;
  code: string | null;
  kind: string;
  value: number;
  minSubtotal: number | null;
  maxUses: number | null;
  usedCount: number;
  brandId: string | null;
  origin: string | null;
  productIds: string[];
  buyQty: number | null;
  payQty: number | null;
  giftMode: string | null;
  giftVariantId: string | null;
  giftSizeMl: number | null;
  onePerCustomer: boolean;
};

export type EngineItem = { variantId: string; productId: string; brandId: string; origin: string; price: number; qty: number; type: string; sizeMl: number | null };
export type GiftVariant = { variantId: string; productId: string; label: string; productName: string; brandName: string; price: number; stock: number | null; sizeMl: number | null };

export type EngineInput = {
  items: EngineItem[];
  promos: EnginePromo[];
  code: string | null;
  /** promos que este cliente ya usó (para "1 uso por cliente") */
  usedByCustomer: Set<string>;
  customerKnown: boolean;
  /** regalos posibles: por id de variante y decants por producto */
  giftVariants: Map<string, GiftVariant>;
  decantsByProduct: Map<string, GiftVariant[]>;
  /** costo de envío con/sin descuento (la tienda lo calcula según la zona) */
  shipping?: (discount: number, free: boolean) => number;
};

export type EngineResult = {
  promo: EnginePromo | null;
  discount: number;
  freeShipping: boolean;
  gift: GiftVariant | null;
  couponError: string | null;
};

const money = (n: number) => `$${n.toLocaleString("es-AR")}`;

export function describePromo(p: Pick<EnginePromo, "kind" | "value" | "buyQty" | "payQty" | "giftMode" | "giftSizeMl">) {
  switch (p.kind) {
    case "porcentaje": return `${p.value}% de descuento`;
    case "monto": return `${money(p.value)} de descuento`;
    case "envio_gratis": return "Envío gratis";
    case "nxm": return `Llevá ${p.buyQty} y pagá ${p.payQty}`;
    case "regalo": return p.giftMode === "decant_del_producto" ? `Decant de ${p.giftSizeMl ?? 5} ml de regalo del perfume que compres` : "Producto de regalo";
    default: return p.kind;
  }
}

export function evaluatePromos(input: EngineInput): EngineResult {
  const { items, promos, code } = input;
  const ship = input.shipping ?? (() => 0);
  const baseShip = ship(0, false);
  let couponError: string | null = null;
  const inCart = new Map<string, number>();
  for (const i of items) inCart.set(i.variantId, (inCart.get(i.variantId) ?? 0) + i.qty);

  type Cand = { promo: EnginePromo; discount: number; freeShipping: boolean; gift: GiftVariant | null; benefit: number };
  const cands: Cand[] = [];

  for (const p of promos) {
    const isCoupon = Boolean(p.code) && p.code === code;
    const fail = (msg: string) => { if (isCoupon) couponError = msg; };
    if (p.code && p.code !== code) continue; // cupón no ingresado
    if (p.maxUses !== null && p.usedCount >= p.maxUses) { fail("El cupón ya se usó el máximo de veces."); continue; }
    if (p.onePerCustomer) {
      if (!input.customerKnown) { fail("Este cupón es de un solo uso por cliente: completá tus datos para aplicarlo."); continue; }
      if (input.usedByCustomer.has(p.id)) { fail("Ya usaste esta promoción."); continue; }
    }
    const eligible = items.filter((i) => (!p.brandId || i.brandId === p.brandId) && (!p.origin || i.origin === p.origin) && (p.productIds.length === 0 || p.productIds.includes(i.productId)));
    const base = eligible.reduce((s, i) => s + i.price * i.qty, 0);
    if (base === 0) { fail("El cupón no aplica a los productos elegidos."); continue; }
    if (p.minSubtotal && base < p.minSubtotal) { fail(`Requiere una compra mínima de ${money(p.minSubtotal)}.`); continue; }

    let discount = 0, freeShipping = false, gift: GiftVariant | null = null;
    if (p.kind === "porcentaje") discount = Math.round((base * Math.min(90, Math.max(0, p.value))) / 100);
    else if (p.kind === "monto") discount = Math.min(base, p.value);
    else if (p.kind === "envio_gratis") freeShipping = true;
    else if (p.kind === "nxm") {
      const buy = p.buyQty ?? 0, pay = p.payQty ?? 0;
      if (buy < 2 || pay < 1 || pay >= buy) continue;
      const units = eligible.flatMap((i) => Array.from({ length: i.qty }, () => i.price)).sort((a, b) => a - b);
      const free = Math.floor(units.length / buy) * (buy - pay);
      if (free === 0) { fail(`Llevá ${buy} productos para aprovechar la promo.`); continue; }
      discount = units.slice(0, free).reduce((s, x) => s + x, 0);
    } else if (p.kind === "regalo") {
      const available = (g: GiftVariant) => g.stock === null || g.stock - (inCart.get(g.variantId) ?? 0) >= 1;
      if (p.giftMode === "decant_del_producto") {
        // El decant del perfume más caro del carrito que tenga decant del tamaño elegido.
        const size = p.giftSizeMl ?? 5;
        const byPrice = [...eligible].filter((i) => i.type !== "decant").sort((a, b) => b.price - a.price);
        for (const i of byPrice) {
          const d = (input.decantsByProduct.get(i.productId) ?? []).find((g) => g.sizeMl !== null && Math.abs(g.sizeMl - size) < 0.01 && available(g));
          if (d) { gift = d; break; }
        }
        if (!gift) { fail(`Ninguno de los perfumes del carrito tiene decant de ${size} ml disponible.`); continue; }
      } else {
        const g = p.giftVariantId ? input.giftVariants.get(p.giftVariantId) : undefined;
        if (!g || !available(g)) { fail("El producto de regalo no tiene stock."); continue; }
        gift = g;
      }
    } else continue;

    const benefit = discount + (baseShip - ship(discount, freeShipping)) + (gift?.price ?? 0);
    cands.push({ promo: p, discount, freeShipping, gift, benefit });
  }

  cands.sort((a, b) => b.benefit - a.benefit || (a.promo.code === code ? -1 : 1));
  const best = cands[0] ?? null;
  if (code && !couponError) {
    if (!promos.some((p) => p.code === code)) couponError = "El cupón no existe o no está vigente.";
    else if (best && best.promo.code !== code) couponError = "Ya tenés aplicada una promoción mejor que este cupón.";
  }
  return { promo: best?.promo ?? null, discount: best?.discount ?? 0, freeShipping: best?.freeShipping ?? false, gift: best?.gift ?? null, couponError };
}
