"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import SearchBox from "./SearchBox";

export default function Header() {
  const { items, total, count } = useCart();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert("Hubo un problema al iniciar el pago. Probá de nuevo.");
      }
    } catch {
      alert("Hubo un problema al iniciar el pago. Probá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

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
                <div key={i.variantId} className="flex justify-between text-sm border-b border-gray-100 pb-3">
                  <div>
                    <p className="font-medium text-gray-900">{i.brandName} {i.productName}</p>
                    <p className="text-gray-400 text-xs">{i.variantLabel} × {i.qty}</p>
                  </div>
                  <p className="text-[#17a930] font-medium">${(i.price * i.qty).toLocaleString("es-AR")}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-4 mt-4">
              <div className="flex justify-between mb-4">
                <span className="text-gray-700">Total</span>
                <span className="text-[#17a930] font-semibold">${total.toLocaleString("es-AR")}</span>
              </div>
              <button
                onClick={handleCheckout}
                disabled={items.length === 0 || loading}
                className="w-full bg-[#1de03c] text-[#06140a] font-semibold rounded-full py-3 shadow-md disabled:opacity-50"
              >
                {loading ? "Redirigiendo..." : "Ir al checkout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
