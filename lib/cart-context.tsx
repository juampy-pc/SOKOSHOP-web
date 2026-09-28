"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type CartItem = {
  variantId: string;
  productName: string;
  brandName: string;
  variantLabel: string;
  price: number;
  qty: number;
  image?: string | null;
  href?: string;
};

type CartContextType = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "qty">) => void;
  setQty: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  total: number;
  count: number;
  ready: boolean;
};

const KEY = "soko-cart-v1";
const MAX_QTY = 10;
const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  // El carrito sobrevive a recargas y a la vuelta desde Mercado Pago.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura única de localStorage al montar
      if (raw) setItems((JSON.parse(raw) as CartItem[]).filter((i) => i && typeof i.variantId === "string" && i.qty > 0));
    } catch {
      /* almacenamiento bloqueado: carrito solo en memoria */
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* ignorado */
    }
  }, [items, ready]);

  function addItem(item: Omit<CartItem, "qty">) {
    setItems((prev) => {
      const existing = prev.find((i) => i.variantId === item.variantId);
      if (existing) return prev.map((i) => (i.variantId === item.variantId ? { ...i, ...item, qty: Math.min(MAX_QTY, i.qty + 1) } : i));
      return [...prev, { ...item, qty: 1 }];
    });
  }
  const setQty = (variantId: string, qty: number) =>
    setItems((prev) => (qty <= 0 ? prev.filter((i) => i.variantId !== variantId) : prev.map((i) => (i.variantId === variantId ? { ...i, qty: Math.min(MAX_QTY, qty) } : i))));
  const remove = (variantId: string) => setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  const clear = () => setItems([]);

  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const count = items.reduce((sum, i) => sum + i.qty, 0);

  return <CartContext.Provider value={{ items, addItem, setQty, remove, clear, total, count, ready }}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}
