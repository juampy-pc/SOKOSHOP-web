import type { Metadata } from "next";
import Link from "next/link";
import { cloudinaryReady } from "@/lib/cloudinary";
import RequestForm from "./RequestForm";

export const metadata: Metadata = {
  title: "Perfumes a pedido | SokoShop",
  description: "¿No encontrás tu perfume? Pedínoslo y te lo conseguimos: te pasamos precio y demora por WhatsApp.",
  alternates: { canonical: "/perfumes-a-pedido" },
};

const STEPS = [
  { n: "1", t: "Nos contás qué perfume buscás", d: "Con el nombre o, si no lo sabés, con una descripción o una foto." },
  { n: "2", t: "Lo buscamos con nuestros proveedores", d: "Verificamos disponibilidad y precio." },
  { n: "3", t: "Te escribimos por WhatsApp", d: "Con el precio y la demora. Si te sirve, lo encargás con una seña." },
];

export default function PerfumesAPedido() {
  return (
    <main className="min-h-screen bg-[#fafaf9]">
      <section className="bg-[#111111] text-white">
        <div className="max-w-5xl mx-auto px-4 md:px-5 py-10 md:py-14">
          <p className="text-xs text-white/50 mb-4"><Link href="/" className="hover:text-[#1de03c]">Inicio</Link> / Perfumes a pedido</p>
          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight">Perfumes <span className="text-[#1de03c]">a pedido</span></h1>
          <p className="text-white/70 mt-3 max-w-xl">¿No encontraste el perfume que buscabas? Pedínoslo y nosotros nos encargamos de conseguirlo.</p>
          <ol className="mt-8 grid md:grid-cols-3 gap-3">
            {STEPS.map((s) => (
              <li key={s.n} className="rounded-2xl bg-white/[0.06] border border-white/10 p-4 flex gap-3">
                <span className="grid place-items-center size-8 shrink-0 rounded-full bg-[#1de03c] text-[#06140a] font-bold text-sm">{s.n}</span>
                <span><span className="block font-medium">{s.t}</span><span className="block text-sm text-white/60 mt-0.5">{s.d}</span></span>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <div className="max-w-2xl mx-auto px-4 md:px-5 -mt-6 pb-16 relative">
        <RequestForm withImage={cloudinaryReady()} />
      </div>
    </main>
  );
}
