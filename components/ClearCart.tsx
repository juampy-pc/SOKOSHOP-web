"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart-context";

/** Vacía el carrito después de un pago aprobado. */
export default function ClearCart() {
  const { clear, ready } = useCart();
  useEffect(() => {
    if (ready) clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo una vez cuando el carrito está cargado
  }, [ready]);
  return null;
}
