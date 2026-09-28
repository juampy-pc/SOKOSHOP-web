"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import SearchBox from "./SearchBox";
import { track } from "@/lib/track";

export default function Header() {
  const { items, total, count, setQty, remove } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#151515]">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center gap-4 justify-between">
          <nav className="hidden md:flex gap-5 text-sm text-gray-400">
            <Link href="/perfumes-arabes" className="hover:text-[#1de03c]">Árabes</Link>
            <Link href="/perfumes-de-disenador" className="hover:text-[#1de03c]">Diseñador</Link>
            <Link href="/perfumes-de-nicho" className="hover:text-[#1de03c]">Nicho</Link>
            <Link href="/marcas-independientes" className="hover:text-[#1de03c]">Independientes</Link>
          </nav>
          <SearchBox />
          <Link href="/" className="text-lg font-semibold text-white">
            Soko<span className="text-[#1de03c]">Shop</span>
          </Link>
          <button
            onClick={() => setOpen(true)}
            className="relative text-sm text-gray-200 border border-white/15 rounded-full px-4 py-2 hover:border-[#1de03c]/50 transition"
          >
            Carrito
            {count > 0 && (
              <span className="absolute -top-2 -right-2 bg-[#1de03c] text-[#06140a] text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {count}
              </span>
            )}
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setOpen(false)}>
          <div
            className="absolute right-0 top-0 h-full w-full max-w-sm bg-white shadow-xl p-6 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Tu carrito</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-900">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4">
              {items.length === 0 && <p className="text-gray-400 text-sm">Todavía no agregaste nada.</p>}
              {items.map((i) => (
                <div key={i.variantId} className="flex gap-3 text-sm border-b border-gray-100 pb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{i.brandName} {i.productName}</p>
                    <p className="text-gray-400 text-xs">{i.variantLabel} · ${i.price.toLocaleString("es-AR")} c/u</p>
                    <div className="mt-2 inline-flex items-center rounded-full border border-gray-200">
                      <button onClick={() => setQty(i.variantId, i.qty - 1)} className="w-8 h-8 text-gray-600" aria-label={`Quitar uno de ${i.productName}`}>−</button>
                      <span className="w-6 text-center tabular-nums" aria-live="polite">{i.qty}</span>
                      <button onClick={() => setQty(i.variantId, i.qty + 1)} disabled={i.qty >= 10} className="w-8 h-8 text-gray-600 disabled:opacity-30" aria-label={`Agregar uno de ${i.productName}`}>+</button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[#17a930] font-medium">${(i.price * i.qty).toLocaleString("es-AR")}</p>
                    <button onClick={() => remove(i.variantId)} className="text-xs text-gray-400 hover:text-red-600 mt-2">Quitar</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-4 mt-4">
              <div className="flex justify-between mb-4">
                <span className="text-gray-700">Total</span>
                <span className="text-[#17a930] font-semibold">${total.toLocaleString("es-AR")}</span>
              </div>
              <Link
                href="/checkout"
                onClick={() => { track("checkout_start", { v: total }); setOpen(false); }}
                aria-disabled={items.length === 0}
                className={`block text-center w-full bg-[#1de03c] text-[#06140a] font-semibold rounded-full py-3 shadow-md ${items.length === 0 ? "pointer-events-none opacity-50" : ""}`}
              >
                Ir a pagar
              </Link>
              <p className="text-xs text-gray-400 text-center mt-2">Envío o retiro y cupones en el paso siguiente.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
