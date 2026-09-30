import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/cart-context";
import Header from "@/components/Header";
import Analytics from "@/components/Analytics";
import Footer from "@/components/Footer";
import PromoBanner from "@/components/PromoBanner";
import VercelInsights from "@/components/VercelInsights";
import WhatsAppBubble from "@/components/WhatsAppBubble";
import { getSetting } from "@/lib/settings";
import { whatsappLink } from "@/lib/nav-config";

// Tipografía autoalojada (se descarga en el build, sin pedidos a Google desde el navegador).
const geist = Geist({ subsets: ["latin"], display: "swap", variable: "--font-geist-sans" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://sokoshop.com.ar"),
  title: "SokoShop | Perfumes árabes y de diseñador originales",
  description: "Perfumes árabes y de diseñador 100% originales. Decants, envíos a todo el país y retiro en Resistencia, Chaco. Asesoramiento por WhatsApp.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const store = await getSetting("tienda");
  return (
    <html lang="es-AR" className={geist.variable}>
      <body className="bg-[#fafaf9] font-sans antialiased">
        <CartProvider>
          <PromoBanner />
          <Header />
          <Analytics />
          {children}
          <Footer />
          <WhatsAppBubble href={whatsappLink(store.whatsapp, "Hola SokoShop! Tengo una consulta.")} />
        </CartProvider>
        <VercelInsights />
      </body>
    </html>
  );
}
