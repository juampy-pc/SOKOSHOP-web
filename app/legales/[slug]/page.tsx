import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { renderMarkdown } from "@/lib/markdown";

export const revalidate = 300;
export async function generateStaticParams() {
  return [];
}

async function load(slug: string) {
  const p = await prisma.legalPage.findUnique({ where: { slug } });
  return p?.published ? p : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await load((await params).slug);
  return p ? { title: `${p.title} · SokoShop` } : {};
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = await load((await params).slug);
  if (!p) notFound();
  return (
    <main className="min-h-screen bg-[#fafaf9] px-5 py-10 max-w-3xl mx-auto">
      <p className="text-xs text-gray-400 mb-6"><Link href="/" className="hover:text-[#17a930]">Inicio</Link> / <span>{p.title}</span></p>
      <article className="legal rounded-2xl bg-white p-6 md:p-10 shadow-[0_2px_16px_rgba(0,0,0,0.05)]" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.body) }} />
      <p className="text-xs text-gray-400 mt-4">Última actualización: {p.updatedAt.toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}</p>
    </main>
  );
}
