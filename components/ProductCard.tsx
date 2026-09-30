import Link from "next/link";
import { cleanProductName } from "@/lib/format";
import { imageUrl } from "@/lib/catalog";
import QuickAdd from "./QuickAdd";

type Props = {
  slug: string;
  brandSlug: string;
  brandName: string;
  name: string;
  price: number | null;
  compareAt?: number | null;
  image?: string | null;
  decantAvailable?: boolean;
  origin?: string;
  quick?: { variantId: string; label: string; price: number; choose: boolean } | null;
};

const originLabel: Record<string, string> = {
  arabe: "ÁRABE",
  disenador: "DISEÑADOR",
  nicho: "NICHO",
  independiente: "ALTERNATIVA",
};

export default function ProductCard({ slug, brandSlug, brandName, name, price, compareAt, image, decantAvailable, origin, quick }: Props) {
  const tag = decantAvailable ? "CON DECANT" : origin ? originLabel[origin] : null;
  const title = cleanProductName(name, brandName);
  const href = `/marcas/${brandSlug}/${slug}`;
  return (
    <div className="group rounded-2xl bg-white p-3 flex flex-col shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all">
    <Link href={href} className="flex flex-col gap-1 flex-1">
      <div className="aspect-[4/5] rounded-xl bg-[#f4f5f3] overflow-hidden mb-2 flex items-center justify-center relative">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- Cloudinary ya entrega el tamaño y formato justos
          <img
            src={imageUrl(image, 400, 500)}
            srcSet={`${imageUrl(image, 300, 375)} 300w, ${imageUrl(image, 400, 500)} 400w, ${imageUrl(image, 600, 750)} 600w`}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            alt={`${brandName} ${title}`}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
        ) : (
          <span className="text-gray-300 text-xs">Sin foto</span>
        )}
        {compareAt && price && <span className="absolute top-2 left-2 bg-[#1de03c] text-[#06140a] text-[11px] font-bold rounded-full px-2 py-0.5">−{Math.round((1 - price / compareAt) * 100)}%</span>}
      </div>
      <span className="text-xs text-gray-400 px-1">{brandName}</span>
      <span className="text-sm font-semibold leading-snug text-gray-900 px-1">{title}</span>
      {price ? (
        <span className="mt-1 px-1 text-[#17a930] font-semibold">
          desde ${price.toLocaleString("es-AR")}
          {compareAt && <span className="ml-1.5 text-xs text-gray-400 line-through font-normal">${compareAt.toLocaleString("es-AR")}</span>}
        </span>
      ) : null}
      {tag && <span className="text-[10px] text-[#a8853f] tracking-wide mt-1 font-medium px-1">{tag}</span>}
    </Link>
    <div className="mt-3">
      {quick ? (
        <QuickAdd variantId={quick.variantId} label={quick.label} price={quick.price} productName={title} brandName={brandName} image={image ?? null} href={href} showPrice={quick.choose && quick.price !== price} />
      ) : (
        <Link href={href} className="block text-center w-full rounded-full border border-gray-200 text-sm font-medium py-2 text-gray-700 hover:border-[#1de03c]">Ver opciones</Link>
      )}
    </div>
    </div>
  );
}
