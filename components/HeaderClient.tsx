"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import SearchBox from "./SearchBox";
import { track } from "@/lib/track";
import { GENDER_PAGES, type NavGroup } from "@/lib/nav-config";

const GENDERS = Object.values(GENDER_PAGES);
const LINKS = [
  { href: "/perfumes-arabes", label: "Árabes" },
  { href: "/perfumes-de-disenador", label: "Diseñador" },
  { href: "/decants", label: "Decants" },
  { href: "/perfumes-a-pedido", label: "Perfumes a pedido" },
];

function Chevron({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}>
      <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function HeaderClient({ groups }: { groups: NavGroup[] }) {
  const { items, total, count, setQty, remove, cartOpen, setCartOpen } = useCart();
  const [menuOpen, setMenuOpen] = useState(false); // "Buscá tu perfume" (escritorio)
  const [origin, setOrigin] = useState(groups[0]?.origin ?? "");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);
  const active = groups.find((g) => g.origin === origin) ?? groups[0];

  // Al navegar se cierran los menús.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMenuOpen(false);
    setMobileOpen(false);
    setSearchOpen(false);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setMenuOpen(false); setMobileOpen(false); setSearchOpen(false); setCartOpen(false); }
    }
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onClick); };
  }, [setCartOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen || cartOpen ? "hidden" : "";
  }, [mobileOpen, cartOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 bg-black border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 md:px-5 h-16 flex items-center gap-3">
          <button type="button" onClick={() => setMobileOpen(true)} className="lg:hidden -ml-1 p-2 text-gray-200" aria-label="Abrir menú" aria-expanded={mobileOpen}>
            <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>

          <Link href="/" className="flex items-center shrink-0" aria-label="SokoShop, ir al inicio">
            <Image src="/logo-sokoshop.png" alt="SokoShop" width={334} height={186} priority className="h-14 w-auto" />
          </Link>

          <nav aria-label="Principal" className="hidden lg:flex flex-1 justify-center items-center gap-1 text-sm">
            <div ref={menuRef} className="relative" onMouseLeave={() => setMenuOpen(false)}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                onMouseEnter={() => setMenuOpen(true)}
                aria-expanded={menuOpen}
                aria-controls="mega-menu"
                className={`flex items-center gap-1 px-3 py-2 rounded-full font-medium transition ${menuOpen ? "bg-[#1de03c] text-[#06140a]" : "text-white hover:text-[#1de03c]"}`}
              >
                Buscá tu perfume <Chevron open={menuOpen} />
              </button>
              {menuOpen && (
                <div id="mega-menu" className="absolute left-1/2 -translate-x-1/2 top-full pt-3 w-[min(92vw,760px)]">
                  <div className="rounded-2xl bg-white shadow-[0_18px_50px_rgba(0,0,0,0.25)] grid grid-cols-[180px_170px_1fr] overflow-hidden text-gray-800">
                    <div className="p-5 bg-[#f6f7f6]">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Por género</p>
                      <ul className="space-y-1">
                        {GENDERS.map((g) => (
                          <li key={g.slug}><Link href={`/${g.slug}`} className="block rounded-lg px-2 py-1.5 hover:bg-white hover:text-[#17a930]">{g.menu}</Link></li>
                        ))}
                        <li><Link href="/decants" className="block rounded-lg px-2 py-1.5 hover:bg-white hover:text-[#17a930]">Decants</Link></li>
                      </ul>
                    </div>
                    <div className="p-5 border-r border-gray-100">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Marcas</p>
                      <ul className="space-y-1" role="tablist" aria-label="Tipo de marca">
                        {groups.map((g) => (
                          <li key={g.origin}>
                            <button
                              type="button"
                              role="tab"
                              aria-selected={active?.origin === g.origin}
                              onMouseEnter={() => setOrigin(g.origin)}
                              onFocus={() => setOrigin(g.origin)}
                              onClick={() => setOrigin(g.origin)}
                              className={`w-full flex items-center justify-between rounded-lg px-2 py-1.5 text-left ${active?.origin === g.origin ? "bg-[#eafbe9] text-[#128a27] font-medium" : "hover:bg-gray-50"}`}
                            >
                              {g.label} <span className="text-xs text-gray-400">{g.brands.length}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                      <Link href="/marcas" className="mt-3 inline-block text-xs text-[#17a930] hover:underline">Todas las marcas →</Link>
                    </div>
                    <div className="p-5" role="tabpanel" aria-label={active?.label}>
                      {active && (
                        <>
                          <div className="flex items-baseline justify-between mb-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{active.label}</p>
                            <Link href={active.href} className="text-xs text-[#17a930] hover:underline">Ver todo {active.label.toLowerCase()} →</Link>
                          </div>
                          <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5 max-h-72 overflow-y-auto">
                            {active.brands.map((b) => (
                              <li key={b.slug}><Link href={`/marcas/${b.slug}`} className="block truncate rounded-lg px-2 py-1.5 hover:bg-gray-50 hover:text-[#17a930]">{b.name}</Link></li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} aria-current={pathname === l.href ? "page" : undefined}
                className={`px-3 py-2 rounded-full transition hover:text-[#1de03c] ${pathname === l.href ? "text-[#1de03c]" : "text-gray-300"}`}>
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto lg:ml-0 flex items-center gap-1.5">
            <button type="button" onClick={() => setSearchOpen((o) => !o)} className="p-2 rounded-full text-gray-200 hover:text-[#1de03c]" aria-label="Buscar" aria-expanded={searchOpen}>
              <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </button>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative flex items-center gap-2 text-sm text-gray-100 border border-white/15 rounded-full pl-3 pr-4 py-2 hover:border-[#1de03c]/60 transition"
              aria-label={`Carrito${count ? `, ${count} productos` : ""}`}
            >
              <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true"><path d="M6 8h12l-1 12H7L6 8z M9 8V6a3 3 0 016 0v2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>
              <span className="hidden sm:inline">Carrito</span>
              {count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#1de03c] text-[#06140a] text-xs font-bold min-w-5 h-5 px-1 rounded-full flex items-center justify-center">{count}</span>
              )}
            </button>
          </div>
        </div>
        {searchOpen && (
          <div className="border-t border-white/10 bg-black">
            <div className="max-w-2xl mx-auto px-4 py-3 flex"><SearchBox autoFocus /></div>
          </div>
        )}
      </header>

      {/* Menú en celulares */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)}>
          <nav aria-label="Menú" className="absolute left-0 top-0 h-full w-[86%] max-w-sm bg-white overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 h-16 bg-black">
              <Image src="/logo-sokoshop.png" alt="SokoShop" width={334} height={186} className="h-10 w-auto" />
              <button type="button" onClick={() => setMobileOpen(false)} className="p-2 text-gray-300" aria-label="Cerrar menú">✕</button>
            </div>
            <div className="p-4 space-y-1 text-gray-800">
              <p className="px-2 pt-1 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Buscá tu perfume</p>
              <div className="grid grid-cols-3 gap-2 pb-2">
                {GENDERS.map((g) => (
                  <Link key={g.slug} href={`/${g.slug}`} className="rounded-xl border border-gray-200 py-2.5 text-center text-sm font-medium active:bg-gray-50">{g.menu}</Link>
                ))}
              </div>
              {groups.map((g) => (
                <details key={g.origin} className="group rounded-xl">
                  <summary className="flex items-center justify-between px-2 py-3 font-medium cursor-pointer list-none">
                    Marcas {g.label.toLowerCase()} <span className="text-gray-400 group-open:rotate-180 transition"><Chevron open={false} /></span>
                  </summary>
                  <ul className="grid grid-cols-2 gap-1 pb-3 pl-2">
                    <li className="col-span-2"><Link href={g.href} className="block px-2 py-1.5 text-sm text-[#17a930] font-medium">Ver todo {g.label.toLowerCase()} →</Link></li>
                    {g.brands.map((b) => (
                      <li key={b.slug}><Link href={`/marcas/${b.slug}`} className="block truncate px-2 py-1.5 text-sm text-gray-600">{b.name}</Link></li>
                    ))}
                  </ul>
                </details>
              ))}
              <hr className="my-2 border-gray-100" />
              {LINKS.map((l) => (
                <Link key={l.href} href={l.href} className="block px-2 py-3 font-medium">{l.label}</Link>
              ))}
              <Link href="/marcas" className="block px-2 py-3 font-medium">Todas las marcas</Link>
              <Link href="/contacto" className="block px-2 py-3 font-medium">Contacto</Link>
            </div>
          </nav>
        </div>
      )}

      {cartOpen && (
        <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setCartOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Tu carrito"
            className="absolute right-0 top-0 h-full w-full max-w-sm bg-white shadow-xl p-6 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Tu carrito</h2>
              <button onClick={() => setCartOpen(false)} className="text-gray-400 hover:text-gray-900" aria-label="Cerrar carrito">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4">
              {items.length === 0 && <p className="text-gray-400 text-sm">Todavía no agregaste nada.</p>}
              {items.map((i) => (
                <div key={i.variantId} className="flex gap-3 text-sm border-b border-gray-100 pb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{i.brandName} {i.productName}</p>
                    <p className="text-gray-400 text-xs">{i.variantLabel} · ${i.price.toLocaleString("es-AR")} c/u</p>
                    <div className="mt-2 inline-flex items-center rounded-full border border-gray-200">
                      <button onClick={() => setQty(i.variantId, i.qty - 1)} className="w-8 h-8 text-gray-600" aria-label={`Quitar uno de ${i.productName}`}>−</button>
                      <span className="w-6 text-center tabular-nums" aria-live="polite">{i.qty}</span>
                      <button onClick={() => setQty(i.variantId, i.qty + 1)} disabled={i.qty >= 10} className="w-8 h-8 text-gray-600 disabled:opacity-30" aria-label={`Agregar uno de ${i.productName}`}>+</button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[#17a930] font-medium">${(i.price * i.qty).toLocaleString("es-AR")}</p>
                    <button onClick={() => remove(i.variantId)} className="text-xs text-gray-400 hover:text-red-600 mt-2">Quitar</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-4 mt-4">
              <div className="flex justify-between mb-4">
                <span className="text-gray-700">Total</span>
                <span className="text-[#17a930] font-semibold">${total.toLocaleString("es-AR")}</span>
              </div>
              <Link
                href="/checkout"
                onClick={() => { track("checkout_start", { v: total }); setCartOpen(false); }}
                aria-disabled={items.length === 0}
                className={`block text-center w-full bg-[#1de03c] text-[#06140a] font-semibold rounded-full py-3 shadow-md ${items.length === 0 ? "pointer-events-none opacity-50" : ""}`}
              >
                Ir a pagar
              </Link>
              <p className="text-xs text-gray-400 text-center mt-2">Envío o retiro y cupones en el paso siguiente.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
