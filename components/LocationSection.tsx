import { getSetting } from "@/lib/settings";

// Mapa y dirección del local: salen de "Datos del local" en el panel.
export default async function LocationSection() {
  const { direccion } = await getSetting("tienda");
  const address = direccion?.trim() || "García Merou 81, Resistencia, Chaco";
  const query = encodeURIComponent(/argentina/i.test(address) ? address : `${address}, Argentina`);
  return (
    <section className="mb-12">
      <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-900 mb-1">¿No sabés dónde encontrarnos?</h2>
      <p className="text-gray-500 text-sm md:text-base mb-6">{address.replace(/\.?$/, ".")}</p>
      <div className="rounded-2xl overflow-hidden border-4 border-white shadow-lg">
        <iframe
          title={`Mapa: ${address}`}
          src={`https://www.google.com/maps?q=${query}&output=embed`}
          width="100%"
          height="320"
          style={{ border: 0, display: "block" }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </section>
  );
}
