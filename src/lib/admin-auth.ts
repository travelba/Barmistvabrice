import { createHash } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "bmsb_admin";

export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? "barmitsva2026";
}

/** Jeton stocke dans le cookie : empreinte du mot de passe + secret. */
export function adminToken(): string {
  const secret = process.env.ADMIN_SECRET ?? "bmsb-secret";
  return createHash("sha256").update(`${adminPassword()}::${secret}`).digest("hex");
}

export async function isAdminAuthed(): Promise<boolean> {
  const store = await cookies();
  return store.get(ADMIN_COOKIE)?.value === adminToken();
}
