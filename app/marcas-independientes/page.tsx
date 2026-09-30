import type { Metadata } from "next";
import ProductListing from "@/components/ProductListing";
import { originPages } from "@/lib/origin-pages";
import { ORIGIN_MENU } from "@/lib/nav-config";

export const revalidate = 300;

const meta = originPages.independiente;
export const metadata: Metadata = {
  title: `${meta.title} | SokoShop`,
  description: meta.intro,
  alternates: { canonical: `/${meta.slug}` },
};

export default function OriginPage() {
  return (
    <ProductListing
      where={{ brand: { origin: "independiente" } }}
      title={meta.title}
      intro={meta.intro}
      chips={ORIGIN_MENU.map((m) => ({ href: `/${originPages[m.origin].slug}`, label: m.label, current: m.origin === "independiente" }))}
    />
  );
}
