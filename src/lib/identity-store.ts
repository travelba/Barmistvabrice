import { getSupabaseAdmin } from "./supabase/admin";
import { IdentityError } from "./identity-error";
import { extensionForMime } from "./identity-file";
import {
  IDENTITY_MIME_TYPES,
  normalizeDocNumber,
  type IdentityMime,
  type ManifestPassenger,
} from "./identity-manifest";
import { normalizeVisualFields } from "./identity-mrz";
import type { IdentityDocumentPublic } from "./identity-slots";

const BUCKET = "identity-documents";

export type { IdentityDocumentPublic } from "./identity-slots";

export type IdentityAdminDoc = {
  id: string;
  bookingId: string;
  firstName: string;
  lastName: string;
};

const PUBLIC_COLUMNS =
  "id, booking_id, passenger_index, sex, last_name, first_name, date_of_birth, place_of_birth, doc_type, doc_number, nationality, expiry_date, specifications";

function mapRow(row: Record<string, unknown>): IdentityDocumentPublic {
  return {
    id: String(row.id),
    bookingId: row.booking_id == null ? "" : String(row.booking_id),
    passengerIndex: row.passenger_index == null ? null : Number(row.passenger_index),
    sex: row.sex === "F" ? "F" : "M",
    lastName: String(row.last_name ?? ""),
    firstName: String(row.first_name ?? ""),
    dateOfBirth: String(row.date_of_birth ?? "").slice(0, 10),
    placeOfBirth: String(row.place_of_birth ?? ""),
    docType: row.doc_type === "CNI" ? "CNI" : "PP",
    docNumber: String(row.doc_number ?? ""),
    nationality: String(row.nationality ?? ""),
    expiryDate: String(row.expiry_date ?? "").slice(0, 10),
    specifications: String(row.specifications ?? ""),
  };
}

export async function listIdentityDocuments(bookingId: string): Promise<IdentityDocumentPublic[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  const { data, error } = await sb
    .from("identity_documents")
    .select(PUBLIC_COLUMNS)
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[identity] list", error.code);
    return [];
  }
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function listIdentityAdminDocs(): Promise<IdentityAdminDoc[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  const { data, error } = await sb
    .from("identity_documents")
    .select("id, booking_id, first_name, last_name")
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[identity] admin-list", error.code);
    return [];
  }
  return (data ?? []).map((row) => ({
    id: String(row.id),
    bookingId: row.booking_id == null ? "" : String(row.booking_id),
    firstName: String(row.first_name ?? ""),
    lastName: String(row.last_name ?? ""),
  }));
}

export function parseIdentityImport(body: unknown): {
  passenger: ManifestPassenger;
  passengerIndex: number | null;
} {
  if (!body || typeof body !== "object") throw new IdentityError("invalid");
  const raw = body as Record<string, unknown>;
  const fields = normalizeVisualFields({
    sex: asString(raw.sex),
    lastName: asString(raw.lastName),
    firstName: asString(raw.firstName),
    dateOfBirth: asString(raw.dateOfBirth),
    placeOfBirth: asString(raw.placeOfBirth),
    docType: asString(raw.docType),
    docNumber: asString(raw.docNumber),
    nationality: asString(raw.nationality),
    expiryDate: asString(raw.expiryDate),
    specifications: asString(raw.specifications),
  });
  if (
    !fields.sex ||
    !fields.lastName ||
    !fields.firstName ||
    !fields.dateOfBirth ||
    !fields.docType ||
    !fields.docNumber ||
    !fields.nationality ||
    !fields.expiryDate ||
    fields.lastName.length > 80 ||
    fields.firstName.length > 80 ||
    fields.placeOfBirth.length > 80 ||
    fields.docNumber.length > 24 ||
    fields.specifications.length > 200
  ) {
    throw new IdentityError("invalid");
  }

  let passengerIndex: number | null = null;
  if (raw.passengerIndex !== null && raw.passengerIndex !== undefined && raw.passengerIndex !== "") {
    if (
      typeof raw.passengerIndex !== "number" ||
      !Number.isInteger(raw.passengerIndex) ||
      raw.passengerIndex < 0 ||
      raw.passengerIndex > 40
    ) {
      throw new IdentityError("invalid");
    }
    passengerIndex = raw.passengerIndex;
  }

  return {
    passenger: {
      sex: fields.sex,
      lastName: fields.lastName,
      firstName: fields.firstName,
      specifications: fields.specifications,
      dateOfBirth: fields.dateOfBirth,
      placeOfBirth: fields.placeOfBirth,
      docType: fields.docType,
      docNumber: normalizeDocNumber(fields.docNumber),
      nationality: fields.nationality,
      expiryDate: fields.expiryDate,
    },
    passengerIndex,
  };
}

export async function saveIdentityScan(input: {
  bookingId: string | null;
  passengerIndex: number | null;
  mime: IdentityMime;
  bytes: Uint8Array;
  passenger: ManifestPassenger;
}): Promise<{ document: IdentityDocumentPublic; previousPath: string | null }> {
  const sb = getSupabaseAdmin();
  if (!sb) throw new IdentityError("storage");

  const docNumber = normalizeDocNumber(input.passenger.docNumber);
  const { data: existing, error: readError } = await sb
    .from("identity_documents")
    .select("storage_path")
    .eq("doc_number", docNumber)
    .maybeSingle();
  if (readError) {
    console.error("[identity] read", readError.code);
    throw new IdentityError("storage");
  }

  const folder = input.bookingId ?? "agence";
  const path = `${folder}/${crypto.randomUUID()}.${extensionForMime(input.mime)}`;
  const upload = await sb.storage.from(BUCKET).upload(path, Buffer.from(input.bytes), {
    contentType: input.mime,
    upsert: false,
  });
  if (upload.error) {
    console.error("[identity] upload");
    throw new IdentityError("storage");
  }

  const { data, error } = await sb
    .from("identity_documents")
    .upsert(
      {
        booking_id: input.bookingId,
        passenger_index: input.passengerIndex,
        storage_path: path,
        mime_type: input.mime,
        sex: input.passenger.sex,
        last_name: input.passenger.lastName,
        first_name: input.passenger.firstName,
        date_of_birth: input.passenger.dateOfBirth,
        place_of_birth: input.passenger.placeOfBirth,
        doc_type: input.passenger.docType,
        doc_number: docNumber,
        nationality: input.passenger.nationality,
        expiry_date: input.passenger.expiryDate,
        specifications: input.passenger.specifications,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "doc_number" },
    )
    .select(PUBLIC_COLUMNS)
    .single();

  if (error || !data) {
    console.error("[identity] upsert", error?.code);
    await sb.storage.from(BUCKET).remove([path]);
    throw new IdentityError("storage");
  }

  const previous = existing?.storage_path ? String(existing.storage_path) : null;
  return {
    document: mapRow(data as Record<string, unknown>),
    previousPath: previous && previous !== path ? previous : null,
  };
}

export async function setIdentitySheetRow(id: string, sheetRow: number): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) return;
  const { error } = await sb
    .from("identity_documents")
    .update({ sheet_row: sheetRow, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) console.error("[identity] sheet-row", error.code);
}

export async function removeIdentityFile(path: string): Promise<void> {
  if (!path || path.includes("..") || path.startsWith("/")) return;
  const sb = getSupabaseAdmin();
  if (!sb) return;
  const { error } = await sb.storage.from(BUCKET).remove([path]);
  if (error) console.error("[identity] remove");
}

export async function openIdentityFile(
  id: string,
): Promise<{ bytes: Uint8Array; mime: IdentityMime } | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const { data, error } = await sb
    .from("identity_documents")
    .select("storage_path, mime_type")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const path = String(data.storage_path ?? "");
  if (!path || path.includes("..") || path.startsWith("/")) return null;
  const mime = data.mime_type;
  if (!isMime(mime)) return null;
  const file = await sb.storage.from(BUCKET).download(path);
  if (file.error || !file.data) return null;
  return { bytes: new Uint8Array(await file.data.arrayBuffer()), mime };
}

function isMime(value: unknown): value is IdentityMime {
  return typeof value === "string" && (IDENTITY_MIME_TYPES as readonly string[]).includes(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}
