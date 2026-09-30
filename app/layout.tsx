import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/lib/cart-context";
import Header from "@/components/Header";
import Analytics from "@/components/Analytics";
import Footer from "@/components/Footer";
import PromoBanner from "@/components/PromoBanner";
import VercelInsights from "@/components/VercelInsights";

export const metadata: Metadata = {
  title: "SokoShop",
  description: "Perfumería online — importadores, mayoristas y minoristas",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR">
      <body className="bg-[#fafaf9]">
        <CartProvider>
          <PromoBanner />
          <Header />
          <Analytics />
          {children}
          <Footer />
        </CartProvider>
        <VercelInsights />
      </body>
    </html>
  );
}
