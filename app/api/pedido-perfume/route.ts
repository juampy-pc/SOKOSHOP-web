import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { layout, sendMail } from "@/lib/mail";
import { getSetting } from "@/lib/settings";
import { cloudinaryReady } from "@/lib/cloudinary";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newCode = () => "PED-" + [...randomBytes(5)].map((b) => ALPHABET[b % ALPHABET.length]).join("");
const str = (v: FormDataEntryValue | null, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const MAX_IMAGE = 4 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Sube la foto del cliente a Cloudinary (carpeta "pedidos"); si falla, el pedido igual se registra. */
async function uploadImage(file: File): Promise<string | null> {
  if (!cloudinaryReady()) return null;
  const timestamp = Math.floor(Date.now() / 1000);
  const params = `folder=pedidos&timestamp=${timestamp}`;
  const signature = createHash("sha1").update(params + process.env.CLOUDINARY_API_SECRET).digest("hex");
  const body = new FormData();
  body.set("file", file);
  body.set("folder", "pedidos");
  body.set("timestamp", String(timestamp));
  body.set("api_key", process.env.CLOUDINARY_API_KEY!);
  body.set("signature", signature);
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body, signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { secure_url?: string };
    return data.secure_url ?? null;
  } catch {
    return null;
  }
}

// Formulario "Perfumes a pedido": registra el pedido, avisa al equipo y devuelve un código.
export async function POST(req: NextRequest) {
  const fd = await req.formData().catch(() => null);
  if (!fd) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  if (str(fd.get("website"), 100)) return NextResponse.json({ code: newCode() }); // trampa para bots
  const fullName = str(fd.get("fullName"), 120);
  const phone = str(fd.get("phone"), 40).replace(/[^\d+]/g, "");
  const unknown = fd.get("unknown") === "1";
  const product = unknown ? null : str(fd.get("product"), 160) || null;
  const details = str(fd.get("details"), 500) || null;
  if (fullName.length < 2) return NextResponse.json({ error: "Escribí tu nombre." }, { status: 400 });
  if (phone.replace(/\D/g, "").length < 8) return NextResponse.json({ error: "Revisá tu WhatsApp (con código de área)." }, { status: 400 });
  if (!product && !details) return NextResponse.json({ error: "Contanos qué perfume buscás (nombre o detalles)." }, { status: 400 });

  const recent = await prisma.perfumeRequest.count({ where: { phone, createdAt: { gte: new Date(Date.now() - 86_400_000) } } });
  if (recent >= 5) return NextResponse.json({ error: "Ya recibimos tus pedidos de hoy. Te vamos a escribir por WhatsApp." }, { status: 429 });

  let imageUrl: string | null = null;
  const image = fd.get("image");
  if (image instanceof File && image.size > 0) {
    if (image.size > MAX_IMAGE) return NextResponse.json({ error: "La imagen supera los 4 MB. Elegí una más liviana." }, { status: 400 });
    if (!IMAGE_TYPES.includes(image.type)) return NextResponse.json({ error: "La imagen tiene que ser JPG, PNG o WEBP." }, { status: 400 });
    imageUrl = await uploadImage(image);
  }

  let code = newCode();
  for (let i = 0; i < 3 && (await prisma.perfumeRequest.findUnique({ where: { code } })); i++) code = newCode();
  const r = await prisma.perfumeRequest.create({ data: { code, fullName, phone, product, details, imageUrl } });

  const alerts = await getSetting("alertas");
  const admin = process.env.ADMIN_URL ?? "https://admin.sokoshop.com.ar";
  for (const to of alerts.emails) {
    const m = layout(`Pedido de perfume ${r.code}`, [
      `${fullName} · WhatsApp ${phone}`,
      `Perfume: ${product ?? "no sabe el nombre"}`,
      ...(details ? [`Detalles: ${details}`] : []),
      ...(imageUrl ? [`Foto: ${imageUrl}`] : []),
    ], { href: `${admin}/a-pedido`, label: "Ver pedidos a pedido" });
    await sendMail({ to, subject: `Nuevo pedido de perfume ${r.code}${product ? ` · ${product}` : ""}`, html: m.html, text: m.text, template: "alerta.pedido_perfume" }).catch(() => {});
  }
  return NextResponse.json({ code: r.code });
}
