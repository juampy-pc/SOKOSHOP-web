import type { Metadata } from "next";
import ProductListing from "@/components/ProductListing";
import { GENDER_PAGES } from "@/lib/nav-config";

export const revalidate = 300;

const page = GENDER_PAGES.masculino;
export const metadata: Metadata = {
  title: `${page.title} | SokoShop`,
  description: page.intro,
  alternates: { canonical: `/${page.slug}` },
};

export default function Page() {
  return (
    <ProductListing
      where={{ gender: "masculino" }}
      title={page.title}
      intro={page.intro}
      chips={Object.entries(GENDER_PAGES).map(([k, g]) => ({ href: `/${g.slug}`, label: g.menu, current: k === "masculino" }))}
    />
  );
}
