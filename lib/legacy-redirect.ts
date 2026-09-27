import { NextRequest, NextResponse } from "next/server";
import { findRedirect } from "@/lib/redirects";

// Responde URLs viejas (TiendaNegocio) con 301/410 reales según la tabla Redirect.
export async function legacyRedirect(req: NextRequest) {
  const path = decodeURIComponent(req.nextUrl.pathname).replace(/\/+$/, "");
  const r = await findRedirect(path);
  if (r?.status === 410) return new NextResponse("Este contenido ya no existe.", { status: 410 });
  if (r?.to) {
    return NextResponse.redirect(new URL(r.to, req.nextUrl.origin), {
      status: r.status === 302 ? 302 : 301,
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" },
    });
  }
  return new NextResponse("No encontrado", { status: 404, headers: { "X-Robots-Tag": "noindex" } });
}
