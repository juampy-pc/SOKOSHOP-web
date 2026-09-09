import Link from "next/link";

export default function PendientePage() {
  return (
    <main className="min-h-screen bg-[#fafaf9] flex items-center justify-center px-5">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center mx-auto mb-5 text-2xl">
          ⏳
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Tu pago está pendiente</h1>
        <p className="text-gray-500 text-sm mb-6">
          Estamos esperando la confirmación (puede pasar con transferencias o pagos en efectivo). Te avisamos apenas se acredite.
        </p>
        <Link href="/" className="text-[#17a930] text-sm font-medium hover:underline">
          Volver a la tienda
        </Link>
      </div>
    </main>
  );
}
