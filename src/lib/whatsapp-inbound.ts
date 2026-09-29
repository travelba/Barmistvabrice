import { IdentityError } from "./identity-error";
import { assertIdentityFile, extensionForMime } from "./identity-file";
import { type IdentityFields, type ManifestPassenger } from "./identity-manifest";
import { readIdentityDocument } from "./identity-ocr";
import { takeIdentityRate } from "./identity-rate";
import { parseIdentityImport, removeIdentityFile, saveIdentityScan, setIdentitySheetRow } from "./identity-store";
import { isManifestSheetConfigured, upsertManifestPassenger } from "./sheets";
import { getSupabaseAdmin } from "./supabase/admin";
import { sendWhatsappText } from "./whatsapp";
import {
  appendWhatsappBatchItem,
  batchItemFromPassenger,
  clearWhatsappBatch,
  keepWhatsappBatch,
  listWhatsappBatch,
  whatsappBatchSettled,
  type WhatsappBatchItem,
} from "./whatsapp-pending";

const PHONE = /^whatsapp:\+\d{8,15}$/;

export type InboundJob = {
  xml: string;
  job?: () => Promise<void>;
};

export function whatsappDecision(body: string): "yes" | "no" | null {
  const text = body
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[!?.]+$/g, "")
    .trim();
  if (/^(oui|yes|ok)$/.test(text)) return "yes";
  if (/^(non|no|annuler)$/.test(text)) return "no";
  return null;
}

export function twimlMessage(text: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${xmlEscape(text)}</Message></Response>`;
}

export function twimlEmpty(): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
}

export async function planWhatsappInbound(params: Record<string, string>): Promise<InboundJob> {
  const phone = params.From ?? "";
  const messageSid = params.MessageSid ?? "";
  if (!PHONE.test(phone) || !messageSid) return { xml: twimlEmpty() };

  const mediaCount = Number(params.NumMedia ?? "0");
  const decision = mediaCount > 0 ? null : whatsappDecision(params.Body ?? "");

  if (decision) return confirmWhatsappIdentity(phone, decision, params.To ?? "");
  if (mediaCount > 0) return startWhatsappRead(phone, messageSid, params);
  return { xml: twimlMessage("Envoie une ou plusieurs photos de passeport ou de carte d'identité.") };
}

async function confirmWhatsappIdentity(
  phone: string,
  decision: "yes" | "no",
  businessNumber: string,
): Promise<InboundJob> {
  if (!takeIdentityRate(`wa-import:${phone}`, 40)) {
    return { xml: twimlMessage("Trop d'essais. Patiente quelques minutes.") };
  }
  if (decision === "no") {
    return {
      xml: twimlMessage("Annulé. Rien n'a été ajouté à la liste du vol."),
      job: async () => {
        const cleared = await clearWhatsappBatch(phone);
        for (const item of cleared) await removeIdentityFile(item.storagePath);
      },
    };
  }
  const items = await listWhatsappBatch(phone);
  if (items.length === 0) {
    return { xml: twimlMessage("Envoie d'abord les photos des passeports.") };
  }
  if (!(await whatsappBatchSettled(phone))) {
    return { xml: twimlMessage("Je finis de lire les photos. Réponds OUI dans quelques secondes.") };
  }
  if (!isManifestSheetConfigured()) {
    return { xml: twimlMessage("La liste du vol n'est pas disponible pour le moment. Renvoie OUI dans un moment.") };
  }
  const label =
    items.length > 1
      ? `${items.length} documents en cours d'ajout à la liste du vol…`
      : "Ajout à la liste du vol…";
  return {
    xml: twimlMessage(label),
    job: () => importWhatsappBatch(phone, businessNumber),
  };
}

async function importWhatsappBatch(phone: string, businessNumber: string): Promise<void> {
  const items = await listWhatsappBatch(phone);
  const added: string[] = [];
  const done = new Set<string>();
  const failed: WhatsappBatchItem[] = [];
  for (const item of items) {
    let parsed: { passenger: ManifestPassenger };
    try {
      parsed = parseIdentityImport(item.passenger);
    } catch {
      await removeIdentityFile(item.storagePath);
      done.add(item.docKey);
      continue;
    }
    try {
      const sheetRow = await upsertManifestPassenger(parsed.passenger);
      try {
        const bytes = await downloadStored(item.storagePath);
        const mime = assertIdentityFile(bytes);
        const saved = await saveIdentityScan({
          bookingId: null,
          passengerIndex: null,
          mime,
          bytes,
          passenger: parsed.passenger,
        });
        await setIdentitySheetRow(saved.document.id, sheetRow);
        if (saved.previousPath) await removeIdentityFile(saved.previousPath);
      } catch (e) {
        console.error("[whatsapp] scan", e instanceof Error ? e.name : "error");
      }
      await removeIdentityFile(item.storagePath);
      done.add(item.docKey);
      const p = parsed.passenger;
      added.push(`${p.firstName} ${p.lastName}`);
    } catch (e) {
      console.error("[whatsapp] import", e instanceof Error ? e.name : "error");
      failed.push(item);
    }
  }

  const current = await listWhatsappBatch(phone);
  const remain = current.filter((item) => !done.has(item.docKey));
  const kept = [...failed, ...remain.filter((item) => !failed.some((row) => row.docKey === item.docKey))];
  if (kept.length === 0) await clearWhatsappBatch(phone);
  else await keepWhatsappBatch(phone, kept);

  const lines = added.length > 0 ? `Ajoutés à la liste du vol :\n${added.map((name) => `- ${name}`).join("\n")}` : "Aucun document ajouté.";
  const retry = kept.length > 0 ? `\n${kept.length} document(s) restent en attente. Réponds OUI pour réessayer.` : "";
  await sendWhatsappText(phone, `${lines}${retry}`, businessNumber).catch(() => undefined);
}

function startWhatsappRead(phone: string, messageSid: string, params: Record<string, string>): InboundJob {
  const urls = mediaUrls(params);
  if (urls.length === 0) {
    return { xml: twimlMessage("Ces photos n'ont pas pu être reçues. Renvoie-les.") };
  }
  const businessNumber = params.To ?? "";
  const label = urls.length > 1 ? `${urls.length} photos reçues. Lecture en cours…` : "Photo reçue. Lecture du document…";
  return {
    xml: twimlMessage(label),
    job: async () => {
      let unread = 0;
      let last: WhatsappBatchItem | null = null;
      for (const url of urls) {
        if (!takeIdentityRate(`wa-read:${phone}`, 80)) {
          unread += 1;
          continue;
        }
        try {
          const item = await readOne(phone, messageSid, url);
          if (item) last = item;
          else unread += 1;
        } catch (e) {
          unread += 1;
          console.error("[whatsapp] read", e instanceof Error ? e.name : "error");
        }
      }
      if (!last) {
        await sendWhatsappText(
          phone,
          "Impossible de lire ces documents. Essaie des photos plus nettes, à plat, sans reflet.",
          businessNumber,
        ).catch(() => undefined);
        return;
      }
      await waitForBurst();
      const batch = await listWhatsappBatch(phone);
      const newest = batch[batch.length - 1];
      if (!newest || newest.docKey !== last.docKey || newest.messageSid !== last.messageSid) return;
      const note = unread > 0 ? `\n${unread} photo(s) illisible(s).` : "";
      await sendWhatsappText(phone, `${batchText(batch)}${note}`, businessNumber).catch(() => undefined);
    },
  };
}

function mediaUrls(params: Record<string, string>): string[] {
  const count = Math.min(Number(params.NumMedia ?? "0") || 0, 10);
  const urls: string[] = [];
  for (let i = 0; i < count; i++) {
    const url = params[`MediaUrl${i}`] ?? "";
    if (isTwilioMediaUrl(url)) urls.push(url);
  }
  return urls;
}

function isTwilioMediaUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "api.twilio.com" || url.hostname.endsWith(".twilio.com"));
  } catch {
    return false;
  }
}

function isPublicMediaRedirect(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return false;
    const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
    if (ipv4) {
      const a = Number(ipv4[1]);
      const b = Number(ipv4[2]);
      if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) {
        return false;
      }
    }
    return host.includes(".");
  } catch {
    return false;
  }
}

async function readOne(phone: string, messageSid: string, mediaUrl: string): Promise<WhatsappBatchItem | null> {
  const downloaded = await downloadTwilioMedia(mediaUrl);
  const mime = assertIdentityFile(downloaded);
  const read = await readIdentityDocument(downloaded, mime);
  const passenger = passengerFromFields(read.fields);
  if (!passenger) return null;
  const path = await storePendingFile(downloaded, mime);
  const item = batchItemFromPassenger(passenger, { messageSid, storagePath: path, mimeType: mime });
  const batch = await appendWhatsappBatchItem(phone, item);
  return batch.find((entry) => entry.docKey === item.docKey) ?? item;
}

function waitForBurst(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 12_000));
}

function batchText(items: WhatsappBatchItem[]): string {
  const tail =
    items.length > 1
      ? "Réponds OUI pour tous les ajouter à la liste du vol, NON pour annuler."
      : "Réponds OUI pour l'ajouter à la liste du vol, NON pour annuler.";
  const lines = [`${items.length} document${items.length > 1 ? "s" : ""} lu${items.length > 1 ? "s" : ""} :`];
  for (const item of items.slice(0, 25)) {
    const p = item.passenger;
    lines.push(`- ${p.lastName} ${p.firstName} — ${p.docType} ${p.docNumber}`);
  }
  if (items.length > 25) lines.push(`- … et ${items.length - 25} autre(s)`);
  const body = lines.join("\n");
  const room = 1500 - tail.length - 2;
  return `${body.length > room ? `${body.slice(0, room)}…` : body}\n\n${tail}`;
}

function passengerFromFields(fields: IdentityFields): ManifestPassenger | null {
  try {
    return parseIdentityImport({ ...fields, specifications: fields.specifications ?? "" }).passenger;
  } catch {
    return null;
  }
}

async function storePendingFile(bytes: Uint8Array, mime: ReturnType<typeof assertIdentityFile>): Promise<string> {
  const sb = getSupabaseAdmin();
  if (!sb) throw new IdentityError("storage");
  const path = `whatsapp/${crypto.randomUUID()}.${extensionForMime(mime)}`;
  const upload = await sb.storage.from("identity-documents").upload(path, Buffer.from(bytes), {
    contentType: mime,
    upsert: false,
  });
  if (upload.error) throw new IdentityError("storage");
  return path;
}

async function downloadStored(path: string): Promise<Uint8Array> {
  const sb = getSupabaseAdmin();
  if (!sb) throw new IdentityError("storage");
  const file = await sb.storage.from("identity-documents").download(path);
  if (file.error || !file.data) throw new IdentityError("storage");
  return new Uint8Array(await file.data.arrayBuffer());
}

async function downloadTwilioMedia(url: string): Promise<Uint8Array> {
  const sid = process.env.TWILIO_ACCOUNT_SID ?? "";
  const token = process.env.TWILIO_AUTH_TOKEN ?? "";
  if (!sid || !token) throw new IdentityError("gemini");
  const auth = `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`;
  let current = url;
  for (let hop = 0; hop < 3; hop++) {
    const res = await fetch(current, {
      headers: { Authorization: auth },
      redirect: "manual",
      signal: AbortSignal.timeout(20_000),
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) break;
      current = new URL(loc, current).toString();
      if (!isPublicMediaRedirect(current)) break;
      continue;
    }
    if (!res.ok) throw new IdentityError("unreadable");
    return new Uint8Array(await res.arrayBuffer());
  }
  throw new IdentityError("unreadable");
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
