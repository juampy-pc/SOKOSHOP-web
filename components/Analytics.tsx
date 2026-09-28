"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/track";

// Una vista por cambio de página.
export default function Analytics() {
  const path = usePathname();
  useEffect(() => {
    track("view");
  }, [path]);
  return null;
}

export function TrackProductView({ productId }: { productId: string }) {
  useEffect(() => {
    track("product_view", { pid: productId });
  }, [productId]);
  return null;
}
