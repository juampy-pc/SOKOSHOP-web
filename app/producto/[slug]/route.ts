import type { NextRequest } from "next/server";
import { legacyRedirect } from "@/lib/legacy-redirect";

// URL de la tienda anterior (TiendaNegocio): 301 a la URL nueva.
export function GET(req: NextRequest) {
  return legacyRedirect(req);
}
