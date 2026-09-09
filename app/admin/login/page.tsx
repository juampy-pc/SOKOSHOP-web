"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Email o contraseña incorrectos.");
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#0b0d0c] text-[#f1f3ef] flex items-center justify-center px-5">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-md"
      >
        <h1 className="text-xl font-semibold mb-1">
          Soko<span className="text-[#1de03c]">Shop</span> Admin
        </h1>
        <p className="text-white/40 text-sm mb-6">Ingresá con tu cuenta de administrador</p>

        {error && (
          <p className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        <label className="block text-xs text-white/50 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm mb-4 outline-none focus:border-[#1de03c]/50"
        />

        <label className="block text-xs text-white/50 mb-1">Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm mb-6 outline-none focus:border-[#1de03c]/50"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#1de03c] text-[#06140a] font-semibold rounded-full py-2.5 hover:bg-[#17a930] transition disabled:opacity-50"
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </main>
  );
}
