"use client";

import { useState } from "react";

// Mismas respuestas que la tienda anterior (sokoshop.com.ar).
const faqs = [
  { q: "¿Los productos son originales?", a: "Sí. Todos nuestros productos son 100% originales y provienen de distribuidores e importadores oficiales." },
  { q: "¿Realizan envíos a todo el país?", a: "Sí. Enviamos a toda Argentina mediante Correo Argentino, Vía Cargo o el transporte que mejor se acomode según tu ubicación. También podés retirar en el local." },
  { q: "¿Cuánto tarda en llegar mi pedido?", a: "Depende de la provincia y del método de envío. Cuando lo despachamos te pasamos el código de seguimiento, y siempre podés escribirnos por cualquier consulta." },
  { q: "¿Qué medios de pago aceptan?", a: "Tarjetas de crédito y débito, transferencia bancaria y los demás medios disponibles en Mercado Pago al pagar." },
  { q: "¿Los perfumes tienen garantía?", a: "Sí. Si recibís un producto con algún inconveniente de fábrica, comunicate con nosotros y lo resolvemos." },
  { q: "¿Puedo cambiar un producto?", a: "Sí, si cumple con las condiciones de cambio. Escribinos y lo coordinamos. Además tenés 10 días corridos desde la entrega para arrepentirte de la compra." },
  { q: "¿Qué es un decant?", a: "Una porción del perfume original trasvasada a un frasco más chico, para probarlo o llevarlo encima antes de comprar el frasco completo." },
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
                aria-expanded={isOpen}
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
