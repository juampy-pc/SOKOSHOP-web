import Link from "next/link";
import { cleanProductName } from "@/lib/format";

type Props = {
  slug: string;
  brandSlug: string;
  brandName: string;
  name: string;
  price: number | null;
  decantAvailable?: boolean;
  origin?: string;
};

const originLabel: Record<string, string> = {
  arabe: "ÁRABE",
  disenador: "DISEÑADOR",
  nicho: "NICHO",
  independiente: "INDEPENDIENTE",
};

export default function ProductCard({
  slug,
  brandSlug,
  brandName,
  name,
  price,
  decantAvailable,
  origin,
}: Props) {
  const tag = decantAvailable ? "CON PROBADOR" : origin ? originLabel[origin] : null;

  return (
    <Link
      href={`/marcas/${brandSlug}/${slug}`}
      className="rounded-2xl bg-white p-4 flex flex-col gap-1 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
    >
      <span className="text-xs text-gray-400">{brandName}</span>
      <span className="text-sm font-semibold leading-snug text-gray-900">{cleanProductName(name, brandName)}</span>
      {price && (
        <span className="mt-2 text-[#17a930] font-semibold">
          desde ${price.toLocaleString("es-AR")}
        </span>
      )}
      {tag && (
        <span className="text-[10px] text-[#a8853f] tracking-wide mt-1 font-medium">{tag}</span>
      )}
    </Link>
  );
}
