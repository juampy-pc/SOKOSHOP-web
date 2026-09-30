import { whatsappLink } from "@/lib/nav-config";

const VIDEO = "https://res.cloudinary.com/duc6rmzga/video/upload/v1782692087/Un_poquito_de_lo_que_vas_a_encontrar_en_Soko_Shop_Perfumes_asesoramiento_buena_atenci%C3%B3n_nqenvo.mp4";
const src = VIDEO.replace("/video/upload/", "/video/upload/c_limit,w_720,q_auto,f_auto/");
const poster = VIDEO.replace("/video/upload/", "/video/upload/so_1,c_limit,w_720,q_auto,f_auto/").replace(/\.mp4$/, ".jpg");

/** "Somos SOKOSHOP": el video de presentación y quiénes somos, con el acceso directo a WhatsApp. */
export default function Presentation({ whatsapp }: { whatsapp: string }) {
  return (
    <section aria-labelledby="h-somos" className="relative my-16 rounded-[28px] overflow-hidden bg-[#0b0b0b] text-white">
      <div aria-hidden="true" className="absolute -top-24 -right-24 size-96 rounded-full bg-[#1de03c]/25 blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-32 -left-20 size-96 rounded-full bg-[#1de03c]/10 blur-3xl" />
      <div className="relative grid md:grid-cols-[minmax(0,1fr)_minmax(0,340px)] gap-8 md:gap-12 items-center p-6 sm:p-10 md:p-14">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#1de03c] mb-4">Quiénes somos</p>
          <h2 id="h-somos" className="text-3xl md:text-[42px] font-semibold leading-tight tracking-tight mb-5">Somos SOKOSHOP</h2>
          <div className="space-y-4 text-white/80 text-base md:text-lg leading-relaxed max-w-xl">
            <p>Nos especializamos en perfumes árabes y de diseñador, ofreciendo una selección de fragancias de calidad para cada estilo y ocasión.</p>
            <p>Brindamos atención personalizada y asesoramiento para ayudarte a elegir la fragancia ideal para vos.</p>
            <p>Descubrí con nosotros tu próxima fragancia favorita.</p>
          </div>
          <a
            href={whatsappLink(whatsapp, "Hola SokoShop! Quiero asesoramiento para elegir un perfume.")}
            target="_blank"
            rel="noopener"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#1de03c] text-[#06140a] font-semibold px-7 py-4 shadow-[0_8px_30px_rgba(29,224,60,0.35)] hover:-translate-y-0.5 hover:shadow-[0_10px_36px_rgba(29,224,60,0.5)] transition"
          >
            <WhatsIcon className="size-5" /> Escribinos por WhatsApp
          </a>
        </div>
        <div className="mx-auto w-full max-w-[340px] rounded-[26px] p-2.5 bg-white/10 border border-white/20 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
          <video
            src={src}
            poster={poster}
            controls
            playsInline
            preload="none"
            className="w-full aspect-[9/16] rounded-[18px] object-cover bg-black"
            aria-label="Video: un poquito de lo que vas a encontrar en SokoShop"
          >
            Tu navegador no puede reproducir este video.
          </video>
        </div>
      </div>
    </section>
  );
}

export function WhatsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.3-.4.3-.4.8-1.4a.5.5 0 000-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3 3 3 0 00-.9 2.2 5.2 5.2 0 001.1 2.7 11.8 11.8 0 004.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 001.8-1.2 2.2 2.2 0 00.1-1.3c0-.1-.2-.2-.5-.3z" />
    </svg>
  );
}
