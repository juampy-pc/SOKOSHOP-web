import Link from "next/link";
import { cleanProductName, shortProductName } from "@/lib/format";
import { imageUrl } from "@/lib/catalog";
import QuickAdd from "./QuickAdd";

type Props = {
  slug: string;
  brandSlug: string;
  brandName: string;
  name: string;
  price: number | null;
  compareAt?: number | null;
  decantPrice?: number | null;
  image?: string | null;
  quick?: { variantId: string; label: string; price: number; compareAt?: number | null; choose: boolean } | null;
  /** Presentación principal (el frasco de 100 ml): su precio va siempre, aunque no tenga stock. */
  main?: { price: number; compareAt: number | null; outOfStock: boolean; isDecant: boolean; from: boolean } | null;
};

const ars = (n: number) => `$${n.toLocaleString("es-AR")}`;

/**
 * Tarjeta de producto: nombre corto (la concentración y el tamaño van aparte), el precio del frasco de
 * 100 ml (con o sin stock; sin stock lleva la etiqueta roja) y, si hay decants, su precio en una línea chica.
 * Un solo botón: agrega el frasco o lleva a elegir.
 */
export default function ProductCard({ slug, brandSlug, brandName, name, price, compareAt, decantPrice, image, quick, main: principal }: Props) {
  const full = cleanProductName(name, brandName);
  const title = shortProductName(name, brandName);
  const detail = full.replace(title, "").replace(/\s{2,}/g, " ").trim();
  const href = `/marcas/${brandSlug}/${slug}`;
  const main = principal ?? (price ? { price, compareAt: compareAt ?? null, from: true, outOfStock: false, isDecant: false } : null);
  const showDecant = decantPrice != null && main != null && !main.isDecant;
  return (
    <div className="group rounded-2xl bg-white p-2.5 sm:p-3 flex flex-col border border-black/[0.04] shadow-[0_1px_2px_rgba(17,17,17,0.04)] hover:shadow-[0_12px_32px_-12px_rgba(17,17,17,0.18)] transition-shadow">
      <Link href={href} className="flex flex-col flex-1">
        <div className="aspect-[4/5] rounded-xl bg-white overflow-hidden mb-3 flex items-center justify-center relative">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element -- Cloudinary ya entrega el tamaño y formato justos
            <img
              src={imageUrl(image, 400, 500)}
              srcSet={`${imageUrl(image, 300, 375)} 300w, ${imageUrl(image, 400, 500)} 400w, ${imageUrl(image, 600, 750)} 600w`}
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              alt={`${brandName} ${full}`}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
            />
          ) : (
            <span className="text-gray-300 text-xs">Sin foto</span>
          )}
          {(main?.outOfStock || main?.compareAt) && (
            <span className="absolute top-2 left-2 flex flex-col items-start gap-1">
              {main.outOfStock && <span className="tag-sin-stock">Sin stock</span>}
              {main.compareAt && <span className="bg-[#1de03c] text-[#06140a] text-[11px] font-bold rounded-full px-2 py-0.5">−{Math.round((1 - main.price / main.compareAt) * 100)}%</span>}
            </span>
          )}
        </div>
        <span className="text-[11px] uppercase tracking-wide text-gray-400 px-0.5">{brandName}</span>
        <span className="text-[15px] font-semibold leading-snug text-gray-900 px-0.5 mt-0.5 line-clamp-2">{title}</span>
        {detail && <span className="text-xs text-gray-500 px-0.5 mt-0.5 truncate">{detail}</span>}
        {main && (
          <span className="mt-2 px-0.5 text-gray-900 font-semibold tabular-nums">
            {main.from && <span className="text-xs font-normal text-gray-500 mr-1">desde</span>}
            {ars(main.price)}
            {main.compareAt && <span className="ml-1.5 text-xs text-gray-400 line-through font-normal">{ars(main.compareAt)}</span>}
          </span>
        )}
        {showDecant && <span className="px-0.5 text-xs text-[#17a930] font-medium mt-0.5">Decant desde {ars(decantPrice!)}</span>}
      </Link>
      <div className="mt-3">
        {quick ? (
          <QuickAdd variantId={quick.variantId} label={quick.label} price={quick.price} productName={full} brandName={brandName} image={image ?? null} href={href} />
        ) : (
          <Link href={href} className="block text-center w-full rounded-full bg-[#111] text-white text-xs sm:text-sm font-medium py-2.5 hover:bg-[#1de03c] hover:text-[#06140a] transition">Ver opciones</Link>
        )}
      </div>
    </div>
  );
}
