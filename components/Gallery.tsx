"use client";

import { useMemo, useState } from "react";
import { imageUrl, videoPoster, videoUrl } from "@/lib/catalog";
import { useSelectedVariant } from "@/components/SelectedVariant";

export type GalleryItem = { url: string; alt: string | null; kind: string; variantId: string | null };

/**
 * Fotos y videos del producto. Con una presentación elegida (ej. el decant) se muestran primero sus fotos
 * propias; las de otras presentaciones se ocultan y las generales quedan después.
 */
export default function Gallery({ images, alt }: { images: GalleryItem[]; alt: string }) {
  const selected = useSelectedVariant()?.variantId ?? null;
  const list = useMemo(() => {
    const own = selected ? images.filter((m) => m.variantId === selected) : [];
    const general = images.filter((m) => !m.variantId);
    return own.length ? [...own, ...general] : general.length ? general : images;
  }, [images, selected]);
  // Al cambiar de presentación vuelve a la primera foto.
  const [pick, setPick] = useState<{ v: string | null; i: number }>({ v: selected, i: 0 });
  const i = pick.v === selected ? Math.min(pick.i, list.length - 1) : 0;

  if (list.length === 0) {
    return (
      <div className="aspect-[4/5] rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)] flex items-center justify-center">
        <span className="text-gray-300 text-sm">Sin foto todavía</span>
      </div>
    );
  }
  const item = list[i];
  return (
    <div className="space-y-3">
      <div className="aspect-[4/5] rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)] overflow-hidden">
        {item.kind === "video" ? (
          <video key={item.url} src={videoUrl(item.url, 1000)} poster={videoPoster(item.url, 800, 1000) || undefined} controls playsInline preload="metadata" className="w-full h-full object-cover bg-black" aria-label={item.alt ?? alt}>
            Tu navegador no puede reproducir este video.
          </video>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element -- Cloudinary entrega tamaño/formato justos */
          <img
            src={imageUrl(item.url, 800, 1000)}
            srcSet={`${imageUrl(item.url, 500, 625)} 500w, ${imageUrl(item.url, 800, 1000)} 800w, ${imageUrl(item.url, 1200, 1500)} 1200w`}
            sizes="(min-width: 768px) 50vw, 100vw"
            alt={item.alt ?? alt}
            fetchPriority={i === 0 ? "high" : "auto"}
            className="w-full h-full object-cover"
          />
        )}
      </div>
      {list.length > 1 && (
        <div className="flex gap-2 overflow-x-auto" role="list" aria-label="Fotos y videos">
          {list.map((m, k) => (
            <button key={m.url} type="button" onClick={() => setPick({ v: selected, i: k })} aria-label={m.kind === "video" ? `Ver video ${k + 1}` : `Ver foto ${k + 1}`} aria-current={k === i} className={`relative shrink-0 w-16 aspect-[4/5] rounded-lg overflow-hidden border-2 ${k === i ? "border-[#1de03c]" : "border-transparent"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- miniatura */}
              <img src={m.kind === "video" ? videoPoster(m.url, 120, 150) : imageUrl(m.url, 120, 150)} alt="" className="w-full h-full object-cover bg-gray-100" loading="lazy" />
              {m.kind === "video" && <span className="absolute inset-0 grid place-items-center text-white text-lg drop-shadow" aria-hidden="true">▶</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
