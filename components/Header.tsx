"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";

export default function Header() {
  const { items, total, count } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#0b0d0c]/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <nav className="hidden md:flex gap-5 text-sm text-white/60">
            <Link href="/perfumes-arabes" className="hover:text-[#1de03c]">Árabes</Link>
            <Link href="/perfumes-de-disenador" className="hover:text-[#1de03c]">Diseñador</Link>
            <Link href="/perfumes-de-nicho" className="hover:text-[#1de03c]">Nicho</Link>
            <Link href="/marcas-independientes" className="hover:text-[#1de03c]">Independientes</Link>
          </nav>
          <Link href="/" className="text-lg font-semibold">
            Soko<span className="text-[#1de03c]">Shop</span>
          </Link>
          <button
            onClick={() => setOpen(true)}
            className="relative text-sm border border-white/15 rounded-full px-4 py-2 hover:border-[#1de03c]/40 transition"
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
        <div
          className="fixed inset-0 bg-black/60 z-50"
          onClick={() => setOpen(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-full max-w-sm bg-[#0e100f] border-l border-white/10 p-6 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Tu carrito</h2>
              <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              {items.length === 0 && (
                <p className="text-white/40 text-sm">Todavía no agregaste nada.</p>
              )}
              {items.map((i) => (
                <div key={i.variantId} className="flex justify-between text-sm border-b border-white/10 pb-3">
                  <div>
                    <p className="font-medium">{i.brandName} {i.productName}</p>
                    <p className="text-white/40 text-xs">{i.variantLabel} × {i.qty}</p>
                  </div>
                  <p className="text-[#1de03c]">${(i.price * i.qty).toLocaleString("es-AR")}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-white/10 pt-4 mt-4">
              <div className="flex justify-between mb-4">
                <span>Total</span>
                <span className="text-[#1de03c] font-semibold">${total.toLocaleString("es-AR")}</span>
              </div>
              <button className="w-full bg-[#1de03c] text-[#06140a] font-semibold rounded-full py-3">
                Ir al checkout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
