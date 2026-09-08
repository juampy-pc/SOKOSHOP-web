"use client";

import { useState } from "react";

type Variant = {
  id: string;
  type: string;
  sizeMl: number | null;
  price: number;
  stock: number | null;
};

const typeLabel: Record<string, string> = {
  decant: "Decant",
  frasco_completo: "Frasco completo",
  body_splash: "Body Splash",
};

export default function VariantSelector({ variants }: { variants: Variant[] }) {
  const [selected, setSelected] = useState(0);
  const v = variants[selected];

  if (!v) return <p className="text-white/40 text-sm">Sin variantes cargadas.</p>;

  return (
    <div>
      <p className="text-2xl font-semibold text-[#1de03c] mb-1">
        ${v.price.toLocaleString("es-AR")}
      </p>
      <p className="text-xs text-white/40 mb-5">
        {v.stock === null
          ? "Se prepara al momento — sujeto a disponibilidad"
          : v.stock <= 2
          ? `Últimas ${v.stock} unidades`
          : `${v.stock} unidades disponibles`}
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {variants.map((opt, i) => (
          <button
            key={opt.id}
            onClick={() => setSelected(i)}
            className={`text-left rounded-xl border px-4 py-2 text-sm transition ${
              i === selected
                ? "border-[#1de03c] bg-[#1de03c]/10 text-[#1de03c]"
                : "border-white/15 text-white/70 hover:border-white/30"
            }`}
          >
            <span className="block font-medium">
              {typeLabel[opt.type] ?? opt.type}
              {opt.sizeMl ? ` ${opt.sizeMl}ml` : ""}
            </span>
            <span className="block text-xs opacity-70">
              ${opt.price.toLocaleString("es-AR")}
            </span>
          </button>
        ))}
      </div>

      <button className="w-full bg-[#1de03c] text-[#06140a] font-semibold rounded-full py-3 hover:bg-[#17a930] transition">
        Agregar al carrito
      </button>
    </div>
  );
}
