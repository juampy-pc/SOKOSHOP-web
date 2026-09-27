import type { Metadata } from "next";
import Link from "next/link";
import LocationSection from "@/components/LocationSection";

export const metadata: Metadata = {
  title: "Contacto | SokoShop",
  description: "Visitanos en García Merou 81, Resistencia, Chaco. Perfumería SokoShop.",
  alternates: { canonical: "/contacto" },
};

// Teléfono, WhatsApp, email y horarios se cargarán desde la configuración del admin (no se inventan acá).
export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#fafaf9] px-5 py-10 max-w-3xl mx-auto">
      <p className="text-xs text-gray-500 mb-4">
        <Link href="/" className="hover:text-[#17a930]">Inicio</Link> / <span>Contacto</span>
      </p>
      <h1 className="text-3xl font-semibold mb-6 text-gray-900">Contacto</h1>
      <LocationSection />
    </main>
  );
}
