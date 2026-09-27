import { prisma } from "@/lib/prisma";

// Redirecciones administradas desde el panel (tabla Redirect: migración de TiendaNegocio, cambios de slug).
// Si la tabla todavía no existe o la base falla, se comporta como "sin redirección".
export async function findRedirect(path: string): Promise<{ to: string | null; status: number } | null> {
  try {
    const r = await prisma.redirect.findUnique({ where: { fromPath: path } });
    if (!r || !r.active) return null;
    return { to: r.toPath, status: r.statusCode };
  } catch (error) {
    console.error("findRedirect:", error);
    return null;
  }
}
