import type { Metadata } from "next";
import ProductListing from "@/components/ProductListing";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Decants de perfumes | SokoShop",
  description: "Probá antes de llevarte el frasco completo: decants de perfumes árabes y de diseñador originales.",
  alternates: { canonical: "/decants" },
};

export default function Page() {
  return (
    <ProductListing
      where={{ OR: [{ decantAvailable: true }, { variants: { some: { type: "decant" } } }] }}
      title="Decants"
      intro="Probá antes de llevarte el frasco completo. Elegí la presentación “Decant” en la ficha de cada perfume."
    />
  );
}
