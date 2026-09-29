"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AgenceGate() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/agence/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError("Mot de passe incorrect");
        setPending(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Connexion impossible");
      setPending(false);
    }
  }

  return (
    <main className="theme-taupe flex min-h-screen items-center justify-center bg-[var(--paper-base)] px-5 text-[var(--text)]">
      <form onSubmit={onSubmit} className="card w-full max-w-sm rounded-2xl p-6">
        <p className="kicker text-[var(--accent-deep)]">Bar Mitsvah · Shon Bechet</p>
        <h1 className="mt-3 font-serif text-3xl">Espace agence</h1>
        <p className="mt-2 text-sm text-[var(--text-soft)]">
          Déposez les passeports et cartes d’identité pour remplir la liste du vol.
        </p>
        <label className="mt-5 block">
          <span className="field-label">Mot de passe</span>
          <input
            className="field"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="btn-gold mt-5 w-full rounded-full px-5 py-2.5 text-sm disabled:opacity-60"
        >
          {pending ? "Ouverture…" : "Ouvrir"}
        </button>
      </form>
    </main>
  );
}
