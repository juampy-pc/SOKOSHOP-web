/** Cinta verde con SOKOSHOP que se desliza: separa bloques cargados de la landing. Solo CSS, decorativa. */
export default function Marquee({ text = "SOKOSHOP", count = 12 }: { text?: string; count?: number }) {
  const row = Array.from({ length: count }, (_, i) => (
    <span key={i} className="flex items-center gap-6 pr-6">
      {text}
      <span className="size-1.5 rounded-full bg-[#06140a]/70" />
    </span>
  ));
  return (
    <div aria-hidden="true" className="overflow-hidden bg-[#1de03c] text-[#06140a] py-2.5 select-none">
      <div className="marquee-track flex w-max text-sm md:text-[15px] font-semibold tracking-[0.12em] whitespace-nowrap">
        <div className="flex">{row}</div>
        <div className="flex">{row}</div>
      </div>
    </div>
  );
}
