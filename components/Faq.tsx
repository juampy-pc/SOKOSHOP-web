"use client";

import { useState } from "react";

const faqs = [
  {
    q: "¿Los productos son originales?",
    a: "Sí. Trabajamos exclusivamente con perfumes 100% originales, importados directamente.",
  },
  {
    q: "¿Realizan envíos a todo el país?",
    a: "Sí, hacemos envíos a todo el país. [PENDIENTE: confirmar tiempos y costo exacto por zona]",
  },
  {
    q: "¿Cuánto tarda en llegar mi pedido?",
    a: "[PENDIENTE: confirmar plazo real de entrega]",
  },
  {
    q: "¿Qué medios de pago aceptan?",
    a: "Tarjetas de débito, crédito, transferencia y efectivo. [PENDIENTE: confirmar si hay cuotas]",
  },
  {
    q: "¿Puedo cambiar un producto?",
    a: "[PENDIENTE: confirmar política real de cambios, para redactarla priorizando tu conveniencia dentro del marco legal]",
  },
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="mb-12">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Preguntas frecuentes</h2>
      <p className="text-gray-400 text-sm mb-6">Lo que más nos preguntan antes de comprar.</p>
      <div className="space-y-2">
        {faqs.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={i} className="rounded-xl bg-white shadow-sm overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full text-left px-4 py-3 flex items-center justify-between text-sm font-medium text-gray-900"
              >
                {f.q}
                <span
                  className={`text-[#17a930] text-lg leading-none inline-block transition-transform duration-300 ${
                    isOpen ? "rotate-45" : "rotate-0"
                  }`}
                >
                  +
                </span>
              </button>
              <div
                className={`grid transition-all duration-300 ease-in-out ${
                  isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <p className="px-4 pb-3 text-sm text-gray-500">{f.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
