import { cookies } from "next/headers";
import { adminPassword, adminToken } from "./admin-auth";

export const AGENCE_COOKIE = "bmsb_agence";

export function agencePassword(): string {
  return adminPassword();
}

export async function isAgenceAuthed(): Promise<boolean> {
  const store = await cookies();
  return store.get(AGENCE_COOKIE)?.value === adminToken();
}
