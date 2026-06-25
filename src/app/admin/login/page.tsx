"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Erreur");
      }
      router.push("/admin");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-navy px-5">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold/15">
          <Lock className="h-6 w-6 text-gold" />
        </div>
        <h1 className="text-center font-serif text-2xl text-navy">Espace agence</h1>
        <p className="mt-1 text-center text-sm text-muted">Accès réservé à l&apos;administration.</p>

        <label className="field-label mt-6">Mot de passe</label>
        <input
          type="password"
          className="field"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        <button type="submit" disabled={loading} className="btn-gold mt-6 w-full rounded-full py-3 text-sm">
          {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Se connecter"}
        </button>
      </form>
    </main>
  );
}
