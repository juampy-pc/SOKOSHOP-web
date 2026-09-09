import Link from "next/link";

export default function ErrorPage() {
  return (
    <main className="min-h-screen bg-[#fafaf9] flex items-center justify-center px-5">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-5 text-2xl">
          ✕
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">El pago no se pudo procesar</h1>
        <p className="text-gray-500 text-sm mb-6">
          No te preocupes, no se te cobró nada. Podés intentar de nuevo o probar con otro medio de pago.
        </p>
        <Link href="/" className="text-[#17a930] text-sm font-medium hover:underline">
          Volver a la tienda
        </Link>
      </div>
    </main>
  );
}
