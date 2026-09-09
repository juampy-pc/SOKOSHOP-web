"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cleanProductName } from "@/lib/format";

type Item = {
  slug: string;
  brandSlug: string;
  brandName: string;
  name: string;
  price: number;
  family: string | null;
};

export default function HeroSpotlight({ items }: { items: Item[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % items.length), 4200);
    return () => clearInterval(t);
  }, [items.length]);

  if (items.length === 0) return null;

  return (
    <div className="relative rounded-3xl bg-gradient-to-br from-[#f4faf5] to-white overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.05)]">
      <div className="relative px-6 py-10 md:px-10 md:py-14 grid md:grid-cols-2 gap-8 items-center">
        <div>
          <p className="text-xs text-gray-400 mb-3">Perfumería online · árabe y de diseñador</p>
          <h1 className="text-3xl md:text-4xl font-semibold leading-tight mb-4 text-gray-900">
            Te atendemos como
            <br />
            <span className="text-[#17a930]">a un amigo, no como a un número.</span>
          </h1>
          <p className="text-gray-500 text-sm max-w-md">
            Asesoramiento real antes de comprar, importadores directos, y la misma
            atención de siempre — ahora también online.
          </p>
        </div>

        <div className="relative h-40 md:h-48">
          {items.map((item, i) => (
            <Link
              key={item.slug}
              href={`/marcas/${item.brandSlug}/${item.slug}`}
              className={`absolute inset-0 rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.08)] p-5 flex flex-col justify-between transition-all duration-700 ${
                i === index ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none"
              }`}
            >
              <div>
                <span className="text-xs text-gray-400">{item.brandName}</span>
                <p className="text-lg font-semibold mt-1 text-gray-900">{cleanProductName(item.name, item.brandName)}</p>
                {item.family && <p className="text-xs text-gray-400 mt-1">{item.family}</p>}
              </div>
              <span className="text-[#17a930] font-semibold">
                desde ${item.price.toLocaleString("es-AR")}
              </span>
            </Link>
          ))}
          <div className="absolute -bottom-6 left-0 flex gap-1.5">
            {items.map((_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full transition-all ${
                  i === index ? "w-6 bg-[#1de03c]" : "w-1.5 bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
