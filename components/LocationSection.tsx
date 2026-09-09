export default function LocationSection() {
  return (
    <section className="mb-12">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">¿No sabés dónde encontrarnos?</h2>
      <p className="text-gray-400 text-sm mb-6">García Merou 81, Resistencia, Chaco.</p>
      <div className="rounded-2xl overflow-hidden border-4 border-white shadow-lg">
        <iframe
          src="https://www.google.com/maps?q=Garcia+Merou+81,+Resistencia,+Chaco,+Argentina&output=embed"
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
