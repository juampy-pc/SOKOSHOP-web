"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { track } from "@/lib/track";
import { useSelectedVariant } from "@/components/SelectedVariant";

type Variant = {
  id: string;
  type: string;
  sizeMl: number | null;
  price: number;
  salePrice: number | null;
  stock: number | null;
};

const finalPrice = (v: Variant) => (v.salePrice && v.salePrice > 0 && v.salePrice < v.price ? v.salePrice : v.price);

const typeLabel: Record<string, string> = {
  decant: "Decant",
  frasco_completo: "Frasco completo",
  body_splash: "Body Splash",
};

export default function VariantSelector({
  variants,
  productName,
  brandName,
  image,
  imageFor,
  href,
}: {
  variants: Variant[];
  productName: string;
  brandName: string;
  image?: string | null;
  /** foto propia de cada presentación (ej. la del decant), para el carrito */
  imageFor?: Record<string, string>;
  href?: string;
}) {
  const [selected, setSelectedIndex] = useState(0);
  const shared = useSelectedVariant();
  const setSelected = (i: number) => {
    setSelectedIndex(i);
    if (variants[i]) shared?.setVariantId(variants[i].id);
  };
  const [added, setAdded] = useState(false);
  const { addItem, setCartOpen } = useCart();
  const router = useRouter();
  const v = variants[selected];

  if (!v) return <p className="text-gray-400 text-sm">Sin variantes cargadas.</p>;

  function handleAdd(buyNow = false) {
    const label = `${typeLabel[v.type] ?? v.type}${v.sizeMl ? ` ${v.sizeMl}ml` : ""}`;
    track("add_to_cart", { vid: v.id, v: finalPrice(v) });
    addItem({
      variantId: v.id,
      productName,
      brandName,
      variantLabel: label,
      price: finalPrice(v),
      image: imageFor?.[v.id] ?? image ?? null,
      href,
    });
    if (buyNow) {
      track("checkout_start", { v: finalPrice(v) });
      router.push("/checkout");
      return;
    }
    setAdded(true);
    setCartOpen(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div>
      <p className="text-2xl font-semibold text-[#17a930] mb-1">
        ${finalPrice(v).toLocaleString("es-AR")}
        {finalPrice(v) < v.price && (
          <>
            <span className="ml-2 text-base text-gray-400 line-through font-normal">${v.price.toLocaleString("es-AR")}</span>
            <span className="ml-2 align-middle text-xs bg-[#1de03c] text-[#06140a] rounded-full px-2 py-0.5 font-bold">−{Math.round((1 - finalPrice(v) / v.price) * 100)}%</span>
          </>
        )}
      </p>
      <p className={`text-xs mb-5 ${v.stock !== null && v.stock <= 0 ? "text-[#e0103a] font-semibold" : "text-gray-400"}`}>
        {v.stock === null
          ? "Se prepara al momento — sujeto a disponibilidad"
          : v.stock <= 0
          ? "Sin stock por ahora"
          : v.stock <= 2
          ? `Últimas ${v.stock} unidades`
          : `${v.stock} unidades disponibles`}
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {variants.map((opt, i) => (
          <button
            key={opt.id}
            onClick={() => setSelected(i)}
            className={`text-left rounded-xl px-4 py-2 text-sm transition ${
              i === selected
                ? "bg-[#eafbee] text-[#17a930] shadow-[0_0_0_1.5px_#1de03c_inset]"
                : "bg-white text-gray-600 shadow-[0_1px_6px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_10px_rgba(0,0,0,0.1)]"
            }`}
          >
            <span className="block font-medium">
              {typeLabel[opt.type] ?? opt.type}
              {opt.sizeMl ? ` ${opt.sizeMl}ml` : ""}
            </span>
            <span className="block text-xs opacity-70">
              ${finalPrice(opt).toLocaleString("es-AR")}
            </span>
            {opt.stock !== null && opt.stock <= 0 && <span className="block text-[10px] font-bold uppercase tracking-wide text-[#e0103a] mt-0.5">Sin stock</span>}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        <button
          onClick={() => handleAdd(true)}
          disabled={v.stock !== null && v.stock <= 0}
          className="w-full bg-[#1de03c] text-[#06140a] font-semibold rounded-full py-3 shadow-[0_2px_10px_rgba(29,224,60,0.3)] hover:bg-[#17a930] transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {v.stock !== null && v.stock <= 0 ? "Sin stock" : "Comprar ahora"}
        </button>
        <button
          onClick={() => handleAdd()}
          disabled={v.stock !== null && v.stock <= 0}
          className="w-full bg-[#111] text-white font-semibold rounded-full py-3 hover:bg-black transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {added ? "¡Agregado!" : "Agregar al carrito"}
        </button>
      </div>
      {v.stock !== null && v.stock <= 0 && (
        <a href="/perfumes-a-pedido" className="block text-center text-sm text-[#17a930] underline mt-3">Encargalo: lo conseguimos para vos</a>
      )}
    </div>
  );
}
