import { createHash } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "bmsb_admin";

/** Mot de passe fixe du back-office (ignorer ADMIN_PASSWORD pour éviter un ancien secret Vercel). */
export const ADMIN_PASSWORD_VALUE = "2026";

export function adminPassword(): string {
  return ADMIN_PASSWORD_VALUE;
}

/** Jeton stocke dans le cookie : empreinte du mot de passe + secret. */
export function adminToken(): string {
  const secret = (process.env.ADMIN_SECRET?.trim() || "bmsb-secret");
  return createHash("sha256").update(`${adminPassword()}::${secret}`).digest("hex");
}

export async function isAdminAuthed(): Promise<boolean> {
  const store = await cookies();
  return store.get(ADMIN_COOKIE)?.value === adminToken();
}
