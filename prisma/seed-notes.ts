import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

type FichaNota = {
  productSlug: string | null;
  olfactiveFamily: string;
  notesStructure: string;
  salida: string[];
  corazon: string[];
  fondo: string[];
};

async function getOrCreateNote(name: string) {
  const clean = name.trim();
  return prisma.note.upsert({
    where: { name: clean },
    update: {},
    create: { name: clean },
  });
}

async function main() {
  const raw = fs.readFileSync(path.join(__dirname, "notes-seed.json"), "utf-8");
  const fichas: FichaNota[] = JSON.parse(raw);

  for (const f of fichas) {
    if (!f.productSlug) {
      console.log("Sin producto encontrado, se salteó:", f.olfactiveFamily);
      continue;
    }

    const product = await prisma.product.update({
      where: { slug: f.productSlug },
      data: {
        olfactiveFamily: f.olfactiveFamily,
        notesStructure: f.notesStructure,
      },
    });

    await prisma.productNote.deleteMany({ where: { productId: product.id } });

    const groups: { position: string; names: string[] }[] = [
      { position: "salida", names: f.salida },
      { position: "corazon", names: f.corazon },
      { position: "fondo", names: f.fondo },
    ];

    for (const g of groups) {
      for (let i = 0; i < g.names.length; i++) {
        const note = await getOrCreateNote(g.names[i]);
        await prisma.productNote.create({
          data: {
            productId: product.id,
            noteId: note.id,
            position: g.position,
            order: i,
          },
        });
      }
    }
    console.log("Cargado:", product.slug);
  }

  console.log("¡Listo!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
