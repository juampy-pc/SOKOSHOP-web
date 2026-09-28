"use client";

import { useState } from "react";
import { imageUrl } from "@/lib/catalog";

export default function Gallery({ images, alt }: { images: { url: string; alt: string | null }[]; alt: string }) {
  const [i, setI] = useState(0);
  if (images.length === 0) {
    return (
      <div className="aspect-[4/5] rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)] flex items-center justify-center">
        <span className="text-gray-300 text-sm">Sin foto todavía</span>
      </div>
    );
  }
  const img = images[Math.min(i, images.length - 1)];
  return (
    <div className="space-y-3">
      <div className="aspect-[4/5] rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary entrega tamaño/formato justos */}
        <img
          src={imageUrl(img.url, 800, 1000)}
          srcSet={`${imageUrl(img.url, 500, 625)} 500w, ${imageUrl(img.url, 800, 1000)} 800w, ${imageUrl(img.url, 1200, 1500)} 1200w`}
          sizes="(min-width: 768px) 50vw, 100vw"
          alt={img.alt ?? alt}
          fetchPriority="high"
          className="w-full h-full object-cover"
        />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto" role="list" aria-label="Fotos">
          {images.map((m, k) => (
            <button key={m.url} type="button" onClick={() => setI(k)} aria-label={`Ver foto ${k + 1}`} aria-current={k === i} className={`shrink-0 w-16 aspect-[4/5] rounded-lg overflow-hidden border-2 ${k === i ? "border-[#1de03c]" : "border-transparent"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- miniatura */}
              <img src={imageUrl(m.url, 120, 150)} alt="" className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
