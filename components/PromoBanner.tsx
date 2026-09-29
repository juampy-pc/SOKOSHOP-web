import { prisma } from "@/lib/prisma";
import { activePromoWhere } from "@/lib/promo-data";
import { describePromo } from "@/lib/promo-engine";

// Franja superior con las promos marcadas "Aviso en la tienda" en el panel.
export default async function PromoBanner() {
  const promos = await prisma.promotion
    .findMany({ where: { ...activePromoWhere(), showBanner: true }, orderBy: { updatedAt: "desc" }, take: 3 })
    .catch(() => []);
  if (promos.length === 0) return null;
  const texts = promos.map((p) => p.bannerText?.trim() || `${describePromo(p)}${p.code ? ` con el cupón ${p.code}` : ""}`);
  return (
    <div className="bg-[#1de03c] text-[#06140a] text-center text-xs sm:text-sm font-medium px-4 py-2" role="region" aria-label="Promociones">
      {texts.map((t, i) => (
        <span key={i} className={i > 0 ? "hidden md:inline" : undefined}>
          {i > 0 && <span className="mx-3 opacity-50" aria-hidden="true">·</span>}
          {t}
        </span>
      ))}
    </div>
  );
}
