import { getSupabaseAdmin } from "./supabase/admin";
import type { ManifestPassenger } from "./identity-manifest";
import { removeIdentityFile } from "./identity-store";

const PENDING_MS = 2 * 60 * 60 * 1000;

export type WhatsappPending = {
  phone: string;
  messageSid: string;
  storagePath: string | null;
  mimeType: string | null;
  passenger: ManifestPassenger | null;
  expiresAt: string;
};

export async function claimInboundMessage(
  messageSid: string,
): Promise<"new" | "duplicate" | "unavailable"> {
  const sb = getSupabaseAdmin();
  if (!sb) return "unavailable";
  await sb
    .from("whatsapp_inbound_messages")
    .delete()
    .lt("received_at", new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString());
  const { error } = await sb.from("whatsapp_inbound_messages").insert({ message_sid: messageSid });
  if (!error) return "new";
  if (error.code === "23505") return "duplicate";
  console.error("[whatsapp] claim", error.code);
  return "unavailable";
}

export async function beginWhatsappRead(phone: string, messageSid: string): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) throw new Error("storage");
  const existing = await getWhatsappPending(phone);
  if (existing?.storagePath) await removeIdentityFile(existing.storagePath);
  const { error } = await sb.from("whatsapp_identity_pending").upsert(
    {
      phone,
      message_sid: messageSid,
      storage_path: null,
      mime_type: null,
      passenger: null,
      expires_at: new Date(Date.now() + PENDING_MS).toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "phone" },
  );
  if (error) {
    console.error("[whatsapp] pending-begin", error.code);
    throw new Error("storage");
  }
}

export async function getWhatsappPending(phone: string): Promise<WhatsappPending | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const { data, error } = await sb
    .from("whatsapp_identity_pending")
    .select("phone, message_sid, storage_path, mime_type, passenger, expires_at")
    .eq("phone", phone)
    .maybeSingle();
  if (error || !data) return null;
  return {
    phone: String(data.phone),
    messageSid: String(data.message_sid),
    storagePath: data.storage_path ? String(data.storage_path) : null,
    mimeType: data.mime_type ? String(data.mime_type) : null,
    passenger: isPassenger(data.passenger) ? data.passenger : null,
    expiresAt: String(data.expires_at),
  };
}

export function pendingIsReady(row: WhatsappPending | null): row is WhatsappPending & {
  passenger: ManifestPassenger;
} {
  if (!row?.passenger) return false;
  return new Date(row.expiresAt).getTime() > Date.now();
}

/** N'écrit le résultat que si aucune photo plus récente n'a pris la place. */
export async function saveWhatsappRead(input: {
  phone: string;
  messageSid: string;
  storagePath: string;
  mimeType: string;
  passenger: ManifestPassenger;
}): Promise<boolean> {
  const sb = getSupabaseAdmin();
  if (!sb) return false;
  const { data, error } = await sb
    .from("whatsapp_identity_pending")
    .update({
      storage_path: input.storagePath,
      mime_type: input.mimeType,
      passenger: input.passenger,
      expires_at: new Date(Date.now() + PENDING_MS).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("phone", input.phone)
    .eq("message_sid", input.messageSid)
    .select("phone");
  if (error) {
    console.error("[whatsapp] pending-save", error.code);
    return false;
  }
  return (data ?? []).length > 0;
}

export async function clearWhatsappPending(phone: string): Promise<WhatsappPending | null> {
  const row = await getWhatsappPending(phone);
  const sb = getSupabaseAdmin();
  if (!sb) return row;
  await sb.from("whatsapp_identity_pending").delete().eq("phone", phone);
  return row;
}

function isPassenger(value: unknown): value is ManifestPassenger {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    (row.sex === "M" || row.sex === "F") &&
    typeof row.lastName === "string" &&
    typeof row.firstName === "string" &&
    typeof row.docNumber === "string" &&
    typeof row.nationality === "string" &&
    typeof row.dateOfBirth === "string" &&
    typeof row.expiryDate === "string" &&
    (row.docType === "PP" || row.docType === "CNI")
  );
}
