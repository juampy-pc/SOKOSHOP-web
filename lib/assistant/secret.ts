// Cifrado de la clave de la API de Claude guardada en la base (AES-256-GCM).
// La llave se deriva de REVALIDATE_SECRET, que ya comparten la tienda y el panel: así las dos la pueden
// descifrar sin agregar otra variable de entorno. Si se cambia REVALIDATE_SECRET hay que volver a cargar la clave.
// Copia del panel (sokoshop-admin, lib/assistant/secret.ts): si se cambia uno, cambiar el otro.
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

function key(): Buffer {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) throw new Error("Falta REVALIDATE_SECRET");
  return Buffer.from(hkdfSync("sha256", secret, "sokoshop", "asistente-api-key", 32));
}

export function sealSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["a1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}

export function openSecret(payload: string): string | null {
  try {
    const [version, iv, tag, data] = payload.split(".");
    if (version !== "a1" || !iv || !tag || !data) return null;
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
