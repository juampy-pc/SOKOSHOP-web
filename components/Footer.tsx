import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";

// Pie con los accesos obligatorios: Botón de arrepentimiento, textos legales y Defensa del Consumidor.
export default async function Footer() {
  const [pages, store] = await Promise.all([
    prisma.legalPage.findMany({ where: { published: true }, select: { slug: true, title: true }, orderBy: { slug: "asc" } }).catch(() => []),
    getSetting("tienda"),
  ]);
  const wa = store.whatsapp.replace(/\D/g, "");
  return (
    <footer className="bg-[#151515] text-gray-400 text-sm mt-16">
      <div className="max-w-6xl mx-auto px-5 py-10 grid gap-8 md:grid-cols-3">
        <div>
          <p className="text-white font-semibold text-lg">Soko<span className="text-[#1de03c]">Shop</span></p>
          <p className="mt-2">{store.direccion}</p>
          {store.horario && <p>{store.horario}</p>}
          <p className="mt-2 flex flex-wrap gap-x-3">
            {wa && <a href={`https://wa.me/${wa.length === 10 ? `549${wa}` : wa}`} className="hover:text-[#1de03c]" target="_blank" rel="noopener">WhatsApp</a>}
            {store.instagram && <a href={`https://instagram.com/${store.instagram.replace("@", "")}`} className="hover:text-[#1de03c]" target="_blank" rel="noopener">Instagram</a>}
            {store.email && <a href={`mailto:${store.email}`} className="hover:text-[#1de03c]">{store.email}</a>}
            <Link href="/contacto" className="hover:text-[#1de03c]">Contacto</Link>
          </p>
        </div>
        <nav aria-label="Información legal" className="flex flex-col gap-1.5">
          {pages.map((p) => <Link key={p.slug} href={`/legales/${p.slug}`} className="hover:text-[#1de03c]">{p.title}</Link>)}
          <a href="https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario" target="_blank" rel="noopener" className="hover:text-[#1de03c]">Defensa de las y los consumidores. Para reclamos ingrese aquí</a>
        </nav>
        <div>
          <Link href="/arrepentimiento" className="inline-block rounded-full border border-[#1de03c] text-[#1de03c] px-5 py-2.5 font-semibold hover:bg-[#1de03c] hover:text-[#06140a] transition">Botón de arrepentimiento</Link>
          <p className="text-xs mt-3">Cancelá tu compra dentro de los 10 días corridos desde la entrega.</p>
        </div>
      </div>
      <p className="text-center text-xs text-gray-500 pb-6">© {new Date().getFullYear()} SokoShop · Resistencia, Chaco</p>
    </footer>
  );
}
