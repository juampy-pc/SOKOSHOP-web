"use client";

import { useCart } from "@/lib/cart-context";
import { track } from "@/lib/track";

/** "Agregar" desde la tarjeta: suma el frasco al carrito y lo abre para pagar en un paso. */
export default function QuickAdd({ variantId, label, price, productName, brandName, image, href, compact, onDark }: { variantId: string; label: string; price: number; productName: string; brandName: string; image: string | null; href: string; compact?: boolean; onDark?: boolean }) {
  const { addItem, setCartOpen } = useCart();
  return (
    <button
      type="button"
      onClick={() => {
        track("add_to_cart", { vid: variantId, v: price });
        addItem({ variantId, productName, brandName, variantLabel: label, price, image, href });
        setCartOpen(true);
      }}
      className={`w-full rounded-full ${onDark ? "bg-white text-[#111]" : "bg-[#111] text-white"} text-xs sm:text-sm font-medium py-2.5 px-2 hover:bg-[#1de03c] hover:text-[#06140a] active:scale-[0.98] transition`}
      aria-label={`Agregar ${brandName} ${productName} (${label}) al carrito`}
    >
      {compact ? "Agregar" : "Agregar al carrito"}
    </button>
  );
}
