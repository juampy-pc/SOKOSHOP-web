import { prisma } from "@/lib/prisma";

// Estados desde los que un pago aprobado puede pasar la orden a pagada.
// Cualquier otro (pagado, pagado_revisar_stock, revisar_monto) significa que
// el pago ya se procesó: no se vuelve a descontar stock.
const OPEN_STATUSES = ["pendiente", "rechazado"];

/**
 * Marca una orden como pagada y descuenta stock, de forma atómica e idempotente.
 * Seguro ante notificaciones duplicadas o concurrentes del mismo pago.
 */
export async function markPaid(
  orderId: string,
  paymentId: string,
  amount: number | undefined,
  currency: string | undefined
): Promise<{ paidNow: boolean }> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return { paidNow: false };

    const amountMatches = currency === "ARS" && amount === order.total;

    // Transición condicional: solo una ejecución concurrente puede "ganar" la orden.
    // Si otra notificación del mismo pago ya la procesó, count es 0 y no se toca el stock.
    const claimed = await tx.order.updateMany({
      where: { id: orderId, status: { in: OPEN_STATUSES } },
      data: { status: amountMatches ? "pagado" : "revisar_monto", mpPaymentId: paymentId },
    });
    if (claimed.count === 0 || !amountMatches) return { paidNow: false };
    await tx.order.update({ where: { id: orderId }, data: { paidAt: new Date() } });
    if (order.promotionId) {
      await tx.promotion.update({ where: { id: order.promotionId }, data: { usedCount: { increment: 1 } } });
    }

    let shortage = false;
    for (const item of order.items) {
      // Decremento atómico: solo descuenta si alcanza el stock. Stock null = no se controla.
      const res = await tx.productVariant.updateMany({
        where: { id: item.productVariantId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      const variant = await tx.productVariant.findUnique({
        where: { id: item.productVariantId },
        select: { stock: true },
      });
      if (res.count === 0 && variant && variant.stock !== null) shortage = true;

      // Movimiento de stock (lo ve el admin). Único por pedido+variante+tipo: no se duplica.
      if (res.count > 0) {
        await tx.stockMovement.create({
          data: {
            variantId: item.productVariantId,
            type: "venta_online",
            quantity: -item.quantity,
            stockAfter: variant?.stock ?? null,
            orderId,
            reason: `Pago MP ${paymentId}`,
          },
        });
      }
    }

    // El pago ya se cobró: no se revierte, se marca para revisión manual en el admin.
    if (shortage) {
      await tx.order.update({
        where: { id: orderId },
        data: { status: "pagado_revisar_stock" },
      });
    }
    return { paidNow: true };
  });
}
