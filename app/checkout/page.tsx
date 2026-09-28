import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";
import CheckoutForm from "./CheckoutForm";

export const metadata: Metadata = { title: "Finalizar compra · SokoShop", robots: { index: false } };
// Siempre fresca: zonas y costos de envío recién cargados en el panel.
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [store, zones, terms] = await Promise.all([
    getSetting("tienda"),
    prisma.shippingZone.findMany({ where: { active: true }, orderBy: [{ sort: "asc" }, { name: "asc" }] }),
    prisma.legalPage.findUnique({ where: { slug: "terminos" }, select: { published: true } }),
  ]);
  return (
    <main className="min-h-screen bg-[#fafaf9] px-5 py-8 max-w-5xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-6">Finalizar compra</h1>
      <CheckoutForm
        pickupAddress={store.direccion}
        pickupHours={store.horario}
        zones={zones.map((z) => ({ id: z.id, name: z.name, description: z.description, price: z.price, freeFrom: z.freeFrom, etaText: z.etaText }))}
        termsUrl={terms?.published ? "/legales/terminos" : null}
      />
    </main>
  );
}
