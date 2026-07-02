import { createHash } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "bmsb_admin";

export function adminPassword(): string {
  // .trim() : robustesse si la variable d'environnement contient un retour
  // a la ligne final (cas frequent quand la valeur est ajoutee via un pipe).
  const fromEnv = process.env.ADMIN_PASSWORD?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : "2026";
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
