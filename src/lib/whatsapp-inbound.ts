import { IdentityError } from "./identity-error";
import { assertIdentityFile, extensionForMime } from "./identity-file";
import { isoToSheetDate, type IdentityFields, type ManifestPassenger } from "./identity-manifest";
import { readIdentityDocument } from "./identity-ocr";
import { takeIdentityRate } from "./identity-rate";
import { parseIdentityImport, removeIdentityFile, saveIdentityScan, setIdentitySheetRow } from "./identity-store";
import { isManifestSheetConfigured, upsertManifestPassenger } from "./sheets";
import { getSupabaseAdmin } from "./supabase/admin";
import { sendWhatsappText } from "./whatsapp";
import {
  beginWhatsappRead,
  clearWhatsappPending,
  getWhatsappPending,
  pendingIsReady,
  saveWhatsappRead,
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

  if (decision) return confirmWhatsappIdentity(phone, decision);
  if (mediaCount > 0) return startWhatsappRead(phone, messageSid, params, mediaCount > 1);
  return { xml: twimlMessage("Envoie la photo du passeport ou de la carte d'identité.") };
}

async function confirmWhatsappIdentity(phone: string, decision: "yes" | "no"): Promise<InboundJob> {
  if (!takeIdentityRate(`wa-import:${phone}`, 30)) {
    return { xml: twimlMessage("Trop d'essais. Patiente quelques minutes.") };
  }
  const row = await getWhatsappPending(phone);
  if (decision === "no") {
    await clearWhatsappPending(phone);
    if (row?.storagePath) await removeIdentityFile(row.storagePath);
    return { xml: twimlMessage("Annulé. Rien n'a été ajouté à la liste du vol.") };
  }
  if (!pendingIsReady(row)) {
    return { xml: twimlMessage("Envoie d'abord la photo du passeport.") };
  }
  if (!isManifestSheetConfigured()) {
    return { xml: twimlMessage("La liste du vol n'est pas disponible pour le moment. Renvoie OUI dans un moment.") };
  }

  let parsed: { passenger: ManifestPassenger };
  try {
    parsed = parseIdentityImport(row.passenger);
  } catch {
    await clearWhatsappPending(phone);
    return { xml: twimlMessage("La lecture est incomplète. Renvoie une photo du document.") };
  }

  let sheetRow: number;
  try {
    sheetRow = await upsertManifestPassenger(parsed.passenger);
  } catch (e) {
    console.error("[whatsapp] import", e instanceof Error ? e.name : "error");
    return {
      xml: twimlMessage("La liste du vol n'a pas pu être mise à jour. Réponds OUI pour réessayer."),
    };
  }

  if (row.storagePath) {
    try {
      const bytes = await downloadStored(row.storagePath);
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
    await removeIdentityFile(row.storagePath);
  }
  await clearWhatsappPending(phone);

  const p = parsed.passenger;
  return {
    xml: twimlMessage(`Ajouté à la liste du vol : ${p.firstName} ${p.lastName}.`),
  };
}

function startWhatsappRead(
  phone: string,
  messageSid: string,
  params: Record<string, string>,
  extra: boolean,
): InboundJob {
  if (!takeIdentityRate(`wa-read:${phone}`, 20)) {
    return { xml: twimlMessage("Trop de photos. Patiente quelques minutes.") };
  }
  const mediaUrl = params.MediaUrl0 ?? "";
  if (!mediaUrl.startsWith("https://")) {
    return { xml: twimlMessage("Cette photo n'a pas pu être reçue. Renvoie-la.") };
  }
  const businessNumber = params.To ?? "";
  return {
    xml: twimlMessage("Photo reçue. Lecture du document…"),
    job: async () => {
      try {
        await beginWhatsappRead(phone, messageSid);
        await readAndReply(phone, messageSid, mediaUrl, extra, businessNumber);
      } catch (e) {
        console.error("[whatsapp] read", e instanceof Error ? e.name : "error");
        await sendWhatsappText(phone, "La lecture n'a pas abouti. Renvoie la photo.", businessNumber).catch(
          () => undefined,
        );
      }
    },
  };
}

async function readAndReply(
  phone: string,
  messageSid: string,
  mediaUrl: string,
  extra: boolean,
  businessNumber: string,
): Promise<void> {
  try {
    const downloaded = await downloadTwilioMedia(mediaUrl);
    const mime = assertIdentityFile(downloaded);
    const read = await readIdentityDocument(downloaded, mime);
    const passenger = passengerFromFields(read.fields);
    if (!passenger) {
      await sendWhatsappText(
        phone,
        "Impossible de lire ce document. Essaie une photo plus nette, à plat, sans reflet.",
        businessNumber,
      );
      return;
    }
    const path = await storePendingFile(downloaded, mime);
    const kept = await saveWhatsappRead({
      phone,
      messageSid,
      storagePath: path,
      mimeType: mime,
      passenger,
    });
    if (!kept) {
      await removeIdentityFile(path);
      return;
    }
    const tail = extra ? "\n\nJ'ai lu le premier fichier. Envoie le suivant après ta réponse." : "";
    await sendWhatsappText(phone, `${previewText(passenger, read.warnings)}${tail}`, businessNumber);
  } catch (e) {
    const code = e instanceof IdentityError ? e.code : "generic";
    console.error("[whatsapp] read", code);
    const text =
      code === "file_type"
        ? "Format non accepté. Envoie une photo (JPEG, PNG, WebP) ou un PDF."
        : code === "file_size"
          ? "Fichier trop lourd (8 Mo maximum)."
          : "La lecture n'a pas abouti. Renvoie la photo.";
    await sendWhatsappText(phone, text, businessNumber).catch(() => undefined);
  }
}

function passengerFromFields(fields: IdentityFields): ManifestPassenger | null {
  try {
    return parseIdentityImport({ ...fields, specifications: fields.specifications ?? "" }).passenger;
  } catch {
    return null;
  }
}

function previewText(p: ManifestPassenger, warnings: string[]): string {
  const lines = [
    "Document lu :",
    `${p.firstName} ${p.lastName}`,
    `${p.sex} · ${isoToSheetDate(p.dateOfBirth)}${p.placeOfBirth ? ` · ${p.placeOfBirth}` : ""}`,
    `${p.docType} ${p.docNumber} · ${p.nationality} · expire le ${isoToSheetDate(p.expiryDate)}`,
  ];
  if (!p.placeOfBirth || warnings.includes("place_missing")) {
    lines.push("Lieu de naissance non lu.");
  }
  if (warnings.includes("expiry_past")) lines.push("Ce document semble expiré.");
  if (warnings.includes("mrz_invalid") || warnings.includes("mrz_unreadable")) {
    lines.push("Vérifie les champs : la bande MRZ n'a pas tout confirmé.");
  }
  lines.push("");
  lines.push("Réponds OUI pour l'ajouter à la liste du vol, NON pour annuler.");
  return lines.join("\n");
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
