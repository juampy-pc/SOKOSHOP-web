// Mails de la tienda: confirmación de compra al cliente y aviso de pedido nuevo al equipo.
import { prisma } from "@/lib/prisma";
import { layout, sendMail } from "@/lib/mail";
import { getSetting } from "@/lib/settings";

const $ = (n: number) => `$${n.toLocaleString("es-AR")}`;

export async function sendOrderEmails(orderId: string) {
  const o = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true, shippingZone: true } });
  if (!o) return;
  const [store, alerts] = await Promise.all([getSetting("tienda"), getSetting("alertas")]);
  const code = o.id.slice(-6).toUpperCase();
  const items = o.items.map((i) => `${i.quantity} × ${i.productName} (${i.variantLabel}) — ${$(i.price * i.quantity)}`);
  const delivery =
    o.deliveryMethod === "envio"
      ? `Envío a ${[o.shipAddress, o.shipCity, o.shipProvince].filter(Boolean).join(", ")}${o.shippingZone ? ` (${o.shippingZone.name}${o.shippingZone.etaText ? `, ${o.shippingZone.etaText}` : ""})` : ""}.`
      : o.shippingZone?.kind === "retiro" && o.shippingZone.address
        ? `Retiro en ${o.shippingZone.name}: ${o.shippingZone.address}${o.shippingZone.hours ? ` (${o.shippingZone.hours})` : ""}. Te avisamos cuando esté listo.`
        : `Retiro en el local: ${store.direccion}${store.horario ? ` (${store.horario})` : ""}. Te avisamos cuando esté listo.`;
  const totals = [
    ...(o.discount > 0 ? [`Descuento${o.couponCode ? ` (${o.couponCode})` : ""}: -${$(o.discount)}`] : []),
    ...(o.shippingCost > 0 ? [`Envío: ${$(o.shippingCost)}`] : []),
    `Total pagado: ${$(o.total)}`,
  ];

  if (o.customerEmail) {
    const { html, text } = layout(`¡Gracias por tu compra! Pedido ${code}`, [
      `Hola ${o.customerName?.split(" ")[0] ?? ""}! Recibimos tu pago y ya estamos preparando tu pedido.`,
      ...items,
      ...totals,
      delivery,
      "Si necesitás cancelar la compra tenés 10 días corridos desde la entrega (Botón de arrepentimiento en sokoshop.com.ar).",
    ]);
    await sendMail({ to: o.customerEmail, subject: `Recibimos tu pedido ${code}`, html, text, template: "pedido.confirmado", orderId: o.id, replyTo: store.email || undefined });
  }
  if (alerts.pedidoNuevo) {
    const admin = process.env.ADMIN_URL ?? "https://admin.sokoshop.com.ar";
    const { html, text } = layout(`Pedido online ${code}: ${$(o.total)}`, [
      `${o.customerName ?? "Cliente"} · ${o.customerPhone ?? ""} · ${o.customerEmail ?? ""}`,
      ...items,
      ...totals,
      o.deliveryMethod === "envio" ? `Envío: ${[o.shipAddress, o.shipCity, o.shipProvince, o.shipZip].filter(Boolean).join(", ")}${o.shipNotes ? ` · ${o.shipNotes}` : ""}` : "Retira en el local.",
      ...(o.status === "pagado_revisar_stock" ? ["ATENCIÓN: faltó stock para algún producto."] : []),
    ], { href: `${admin}/pedidos/${o.id}`, label: "Ver el pedido" });
    for (const to of alerts.emails) await sendMail({ to, subject: `Nuevo pedido ${code} · ${$(o.total)}`, html, text, template: "alerta.pedido", orderId: o.id });
  }
}
