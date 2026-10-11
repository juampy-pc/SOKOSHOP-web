"use client";

import { useSelectedVariant } from "@/components/SelectedVariant";

/**
 * Etiqueta "Sin stock" sobre la foto de la ficha. Sigue a la presentación elegida; al entrar mira la
 * primera (el frasco de 100 ml).
 */
export default function StockBadge({ outOfStock, firstId }: { outOfStock: string[]; firstId: string | null }) {
  const id = useSelectedVariant()?.variantId ?? firstId;
  if (!id || !outOfStock.includes(id)) return null;
  return <span className="tag-sin-stock absolute top-3 left-3 z-10 pointer-events-none !text-xs !px-3 !py-1">Sin stock</span>;
}
