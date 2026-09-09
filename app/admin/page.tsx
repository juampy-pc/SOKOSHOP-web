import { auth, signOut } from "@/auth";

export default async function AdminHome() {
  const session = await auth();

  return (
    <main className="min-h-screen bg-[#0b0d0c] text-[#f1f3ef] px-5 py-10">
      <h1 className="text-2xl font-semibold mb-2">Panel de administración</h1>
      <p className="text-white/50 text-sm mb-8">
        Hola, {session?.user?.name} ({session?.user && (session.user as { role?: string }).role})
      </p>

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/admin/login" });
        }}
      >
        <button className="text-sm border border-white/15 rounded-full px-4 py-2 hover:border-[#1de03c]/40">
          Cerrar sesión
        </button>
      </form>
    </main>
  );
}
