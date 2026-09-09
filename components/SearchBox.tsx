"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cleanProductName } from "@/lib/format";

type Result = { id: string; slug: string; name: string; brandSlug: string; brandName: string };

export default function SearchBox() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data);
      setOpen(true);
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function goToResults() {
    if (query.trim().length < 2) return;
    router.push(`/buscar?q=${encodeURIComponent(query)}`);
    setOpen(false);
  }

  return (
    <div ref={boxRef} className="relative flex-1 max-w-xs">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && goToResults()}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Buscar perfume, marca..."
        className="w-full bg-white/10 border border-white/15 rounded-full px-4 py-2 text-sm text-white placeholder:text-gray-400 outline-none focus:border-[#1de03c]/50 transition"
      />
      {open && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-white border border-gray-100 rounded-xl overflow-hidden shadow-xl z-50">
          {results.slice(0, 6).map((r) => (
            <Link
              key={r.id}
              href={`/marcas/${r.brandSlug}/${r.slug}`}
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0 text-gray-900"
            >
              <span className="text-gray-400 text-xs">{r.brandName}</span>
              <br />
              {cleanProductName(r.name, r.brandName)}
            </Link>
          ))}
          <button
            onClick={goToResults}
            className="w-full text-left px-4 py-2.5 text-sm text-[#17a930] hover:bg-gray-50"
          >
            Ver todos los resultados →
          </button>
        </div>
      )}
    </div>
  );
}
