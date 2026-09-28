import Link from "next/link";
import { cleanProductName } from "@/lib/format";
import { imageUrl } from "@/lib/catalog";

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
};

const originLabel: Record<string, string> = {
  arabe: "ÁRABE",
  disenador: "DISEÑADOR",
  nicho: "NICHO",
  independiente: "INDEPENDIENTE",
};

export default function ProductCard({ slug, brandSlug, brandName, name, price, compareAt, image, decantAvailable, origin }: Props) {
  const tag = decantAvailable ? "CON PROBADOR" : origin ? originLabel[origin] : null;
  const title = cleanProductName(name, brandName);
  return (
    <Link
      href={`/marcas/${brandSlug}/${slug}`}
      className="group rounded-2xl bg-white p-3 flex flex-col gap-1 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
    >
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
  );
}
