import type { Metadata } from "next";
import Link from "next/link";
import WithdrawalForm from "./WithdrawalForm";

export const metadata: Metadata = { title: "Botón de arrepentimiento · SokoShop", description: "Cancelá tu compra dentro de los 10 días corridos desde la entrega." };

export default function ArrepentimientoPage() {
  return (
    <main className="min-h-screen bg-[#fafaf9] px-5 py-10 max-w-2xl mx-auto">
      <p className="text-xs text-gray-400 mb-6"><Link href="/" className="hover:text-[#17a930]">Inicio</Link> / <span>Botón de arrepentimiento</span></p>
      <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-3">Botón de arrepentimiento</h1>
      <p className="text-gray-600 text-sm leading-relaxed mb-6">
        Podés revocar tu compra dentro de los <strong>10 días corridos</strong> desde que recibiste el producto (Ley 24.240, art. 34, y Resolución 424/2020).
        Completá el formulario: te damos un <strong>código de identificación</strong> al instante y te contactamos para coordinar la devolución, sin costo para vos.
      </p>
      <WithdrawalForm />
    </main>
  );
}
