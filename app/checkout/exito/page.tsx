import Link from "next/link";
import ClearCart from "@/components/ClearCart";

export const metadata = { title: "¡Gracias por tu compra! · SokoShop", robots: { index: false } };

export default async function ExitoPage({ searchParams }: { searchParams: Promise<{ external_reference?: string }> }) {
  const ref = (await searchParams).external_reference;
  const code = ref && /^[a-z0-9]{10,40}$/.test(ref) ? ref.slice(-6).toUpperCase() : null;
  return (
    <main className="min-h-screen bg-[#fafaf9] flex items-center justify-center px-5">
      <ClearCart />
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-full bg-[#eafbee] text-[#17a930] flex items-center justify-center mx-auto mb-5 text-2xl">✓</div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">¡Listo, tu pago se acreditó!</h1>
        {code && <p className="text-gray-900 mb-2">Pedido <strong>{code}</strong></p>}
        <p className="text-gray-500 text-sm mb-6">Te mandamos la confirmación por mail. Te avisamos cuando esté listo para retirar o en camino.</p>
        <Link href="/" className="text-[#17a930] text-sm font-medium hover:underline">Volver a la tienda</Link>
      </div>
    </main>
  );
}
