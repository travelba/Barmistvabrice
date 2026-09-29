import { foldName, normalizeDocNumber, toIsoDate, type ManifestPassenger } from "./identity-manifest";
import { removeIdentityFile } from "./identity-store";
import { getSupabaseAdmin } from "./supabase/admin";

const PENDING_MS = 2 * 60 * 60 * 1000;

export type WhatsappBatchItem = {
  messageSid: string;
  storagePath: string;
  mimeType: string;
  passenger: ManifestPassenger;
  docKey: string;
  personKey: string;
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

export function batchItemFromPassenger(
  passenger: ManifestPassenger,
  extra: { messageSid: string; storagePath: string; mimeType: string },
): WhatsappBatchItem {
  return {
    ...extra,
    passenger,
    docKey: normalizeDocNumber(passenger.docNumber),
    personKey: `${foldName(passenger.lastName)}|${foldName(passenger.firstName)}|${toIsoDate(passenger.dateOfBirth)}`,
  };
}

export async function appendWhatsappBatchItem(phone: string, item: WhatsappBatchItem): Promise<WhatsappBatchItem[]> {
  const sb = getSupabaseAdmin();
  if (!sb) throw new Error("storage");
  const { data, error } = await sb.rpc("append_whatsapp_identity_item", {
    p_phone: phone,
    p_item: item,
  });
  if (error) {
    console.error("[whatsapp] append", error.code);
    throw new Error("storage");
  }
  const payload = (data ?? {}) as { items?: unknown; removed?: unknown };
  const removed = Array.isArray(payload.removed) ? payload.removed : [];
  for (const path of removed) {
    if (typeof path === "string") await removeIdentityFile(path);
  }
  return parseItems(payload.items);
}

export async function whatsappBatchSettled(phone: string): Promise<boolean> {
  const sb = getSupabaseAdmin();
  if (!sb) return true;
  const { data } = await sb
    .from("whatsapp_identity_pending")
    .select("updated_at")
    .eq("phone", phone)
    .maybeSingle();
  if (!data?.updated_at) return true;
  return Date.now() - new Date(String(data.updated_at)).getTime() >= 10_000;
}

export async function listWhatsappBatch(phone: string): Promise<WhatsappBatchItem[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  const { data, error } = await sb
    .from("whatsapp_identity_pending")
    .select("items, passenger, storage_path, mime_type, message_sid, expires_at")
    .eq("phone", phone)
    .maybeSingle();
  if (error || !data) return [];
  if (new Date(String(data.expires_at)).getTime() <= Date.now()) return [];
  const items = parseItems(data.items);
  if (items.length > 0) return items;
  if (isPassenger(data.passenger) && data.storage_path) {
    return [
      batchItemFromPassenger(data.passenger, {
        messageSid: String(data.message_sid ?? ""),
        storagePath: String(data.storage_path),
        mimeType: String(data.mime_type ?? ""),
      }),
    ];
  }
  return [];
}

export async function clearWhatsappBatch(phone: string): Promise<WhatsappBatchItem[]> {
  const items = await listWhatsappBatch(phone);
  const sb = getSupabaseAdmin();
  if (!sb) return items;
  await sb.from("whatsapp_identity_pending").delete().eq("phone", phone);
  return items;
}

export async function keepWhatsappBatch(phone: string, items: WhatsappBatchItem[]): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) return;
  await sb
    .from("whatsapp_identity_pending")
    .update({
      items,
      passenger: null,
      storage_path: null,
      mime_type: null,
      expires_at: new Date(Date.now() + PENDING_MS).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("phone", phone);
}

function parseItems(value: unknown): WhatsappBatchItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    if (!isPassenger(row.passenger) || typeof row.storagePath !== "string") return [];
    return [
      {
        messageSid: String(row.messageSid ?? ""),
        storagePath: row.storagePath,
        mimeType: String(row.mimeType ?? ""),
        passenger: row.passenger,
        docKey: String(row.docKey ?? normalizeDocNumber(row.passenger.docNumber)),
        personKey: String(row.personKey ?? ""),
      },
    ];
  });
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
