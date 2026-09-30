import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";
import { whatsappLink } from "@/lib/nav-config";
import { WhatsIcon } from "./Presentation";

const SHOP = [
  { href: "/perfumes-arabes", label: "Perfumes árabes" },
  { href: "/perfumes-de-disenador", label: "Perfumes de diseñador" },
  { href: "/perfumes-de-nicho", label: "Perfumes de nicho" },
  { href: "/perfumes-femeninos", label: "Femeninos" },
  { href: "/perfumes-masculinos", label: "Masculinos" },
  { href: "/perfumes-unisex", label: "Unisex" },
  { href: "/decants", label: "Decants" },
  { href: "/marcas", label: "Todas las marcas" },
];

const link = "text-white/60 hover:text-[#1de03c] transition";
const heading = "text-white text-sm font-semibold mb-3";

// Pie con los accesos obligatorios: Botón de arrepentimiento, textos legales y Defensa del Consumidor.
export default async function Footer() {
  const [pages, store] = await Promise.all([
    prisma.legalPage.findMany({ where: { published: true }, select: { slug: true, title: true }, orderBy: { slug: "asc" } }).catch(() => []),
    getSetting("tienda"),
  ]);
  const ig = store.instagram.replace("@", "").trim();
  const map = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`SokoShop ${store.direccion}`)}`;
  return (
    <footer className="bg-black text-sm mt-16 border-t border-white/10">
      <div className="max-w-6xl mx-auto px-4 md:px-5 pt-12 pb-10 grid gap-10 md:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))]">
        <div>
          <Link href="/" aria-label="SokoShop, ir al inicio" className="inline-block">
            <Image src="/logo-sokoshop.png" alt="SokoShop" width={334} height={186} className="h-16 w-auto" />
          </Link>
          <p className="mt-4 text-white/60 leading-relaxed max-w-xs">Perfumes árabes y de diseñador 100% originales, con asesoramiento de verdad.</p>
          {store.whatsapp && (
            <a href={whatsappLink(store.whatsapp, "Hola SokoShop! Tengo una consulta.")} target="_blank" rel="noopener"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#1de03c] text-[#06140a] font-semibold px-5 py-2.5 hover:bg-white transition">
              <WhatsIcon className="size-4" /> Escribinos
            </a>
          )}
        </div>

        <nav aria-label="Tienda">
          <p className={heading}>Comprar</p>
          <ul className="space-y-2">
            {SHOP.map((l) => <li key={l.href}><Link href={l.href} className={link}>{l.label}</Link></li>)}
          </ul>
        </nav>

        <nav aria-label="Ayuda">
          <p className={heading}>Ayuda</p>
          <ul className="space-y-2">
            <li><Link href="/perfumes-a-pedido" className={link}>Perfumes a pedido</Link></li>
            <li><Link href="/contacto" className={link}>Contacto</Link></li>
            {pages.map((p) => <li key={p.slug}><Link href={`/legales/${p.slug}`} className={link}>{p.title}</Link></li>)}
          </ul>
        </nav>

        <div>
          <p className={heading}>Visitanos</p>
          <address className="not-italic space-y-2 text-white/60">
            <a href={map} target="_blank" rel="noopener" className={`block ${link}`}>{store.direccion}</a>
            {store.horario && <p>{store.horario}</p>}
            {ig && <a href={`https://instagram.com/${ig}`} target="_blank" rel="noopener" className={`block ${link}`}>Instagram @{ig}</a>}
            {store.email && <a href={`mailto:${store.email}`} className={`block break-all ${link}`}>{store.email}</a>}
          </address>
          <Link href="/arrepentimiento" className="mt-5 inline-block rounded-full border border-[#1de03c] text-[#1de03c] px-4 py-2 font-semibold hover:bg-[#1de03c] hover:text-[#06140a] transition">Botón de arrepentimiento</Link>
          <p className="text-xs text-white/40 mt-2">Cancelá tu compra dentro de los 10 días corridos desde la entrega.</p>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 md:px-5 pt-5 pb-24 md:pb-5 md:pr-24 flex flex-col md:flex-row gap-3 md:items-center md:justify-between text-xs text-white/40">
          <p>© {new Date().getFullYear()} SokoShop · Resistencia, Chaco · Pagos seguros con Mercado Pago</p>
          <a href="https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario" target="_blank" rel="noopener" className="hover:text-[#1de03c] transition">Defensa de las y los consumidores. Para reclamos ingrese aquí</a>
        </div>
      </div>
    </footer>
  );
}
