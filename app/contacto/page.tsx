import type { Metadata } from "next";
import Link from "next/link";
import LocationSection from "@/components/LocationSection";

// La dirección del mapa sale del panel: se refresca cada 5 minutos (y al guardar "Datos del local").
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Contacto | SokoShop",
  description: "Visitanos en nuestro local de Resistencia, Chaco. Perfumería SokoShop.",
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
