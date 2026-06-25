"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function AdminLogout() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  }
  return (
    <button
      onClick={logout}
      className="inline-flex items-center gap-1 rounded-full border border-cream/30 px-4 py-2 text-sm text-cream transition hover:bg-cream/10"
    >
      <LogOut className="h-4 w-4" /> Déconnexion
    </button>
  );
}
