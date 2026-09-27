// La tienda NO migra: el esquema es del repo sokoshop-admin.
// Copia su prisma/schema.prisma (sin directUrl, que solo usa `prisma migrate`) y regenera el cliente.
// Uso: npm run schema:sync [-- ruta/al/sokoshop-admin]   (por defecto ../sokoshop-admin)
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const adminDir = resolve(process.argv[2] ?? "../sokoshop-admin");
const source = readFileSync(`${adminDir}/prisma/schema.prisma`, "utf8");
const header =
  "// GENERADO: copia de sokoshop-admin/prisma/schema.prisma (npm run schema:sync).\n" +
  "// NO editar acá ni correr `prisma migrate` / `db push` desde la tienda.\n\n";
writeFileSync("prisma/schema.prisma", header + source.replace(/^\s*directUrl\s*=.*\n/m, ""));
execSync("npx prisma generate", { stdio: "inherit" });
