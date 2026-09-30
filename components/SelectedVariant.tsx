"use client";

import { createContext, useContext, useState } from "react";

// Presentación que el cliente tocó en la ficha: la galería muestra primero sus fotos (ej. las del decant).
// Arranca vacía: al entrar se ve la foto principal del perfume.
const Ctx = createContext<{ variantId: string | null; setVariantId: (id: string) => void } | null>(null);

export function SelectedVariantProvider({ initial, children }: { initial: string | null; children: React.ReactNode }) {
  const [variantId, setVariantId] = useState(initial);
  return <Ctx.Provider value={{ variantId, setVariantId }}>{children}</Ctx.Provider>;
}

export const useSelectedVariant = () => useContext(Ctx);
