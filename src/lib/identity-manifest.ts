/**
 * Champs d'une pièce d'identité et choix de la ligne du manifeste de vol.
 * Fonctions pures : pas d'accès réseau, pas de journal des numéros.
 */

export const MANIFEST_DATA_START_ROW = 7;
export const IDENTITY_MAX_BYTES = 8 * 1024 * 1024;

export const IDENTITY_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
] as const;

export type IdentityMime = (typeof IDENTITY_MIME_TYPES)[number];

export type IdentitySex = "M" | "F";
export type IdentityDocType = "PP" | "CNI";

export type IdentityFields = {
  sex: IdentitySex | "";
  lastName: string;
  firstName: string;
  /** ISO YYYY-MM-DD, ou vide si illisible. */
  dateOfBirth: string;
  placeOfBirth: string;
  docType: IdentityDocType | "";
  docNumber: string;
  /** Code ICAO à 3 lettres, ou vide. */
  nationality: string;
  expiryDate: string;
  specifications: string;
};

export type ManifestPassenger = {
  sex: IdentitySex;
  lastName: string;
  firstName: string;
  specifications: string;
  dateOfBirth: string;
  placeOfBirth: string;
  docType: IdentityDocType;
  docNumber: string;
  nationality: string;
  expiryDate: string;
};

export type ManifestScanRow = {
  rowNumber: number;
  numberCell: string;
  lastName: string;
  docNumber: string;
};

export type ManifestTarget = {
  rowNumber: number;
  /** null : la colonne A du modèle est déjà numérotée, on ne l'écrit pas. */
  numberToWrite: string | null;
};

export function emptyIdentityFields(): IdentityFields {
  return {
    sex: "",
    lastName: "",
    firstName: "",
    dateOfBirth: "",
    placeOfBirth: "",
    docType: "",
    docNumber: "",
    nationality: "",
    expiryDate: "",
    specifications: "",
  };
}

export function normalizeDocNumber(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export function foldName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase();
}

export function toIsoDate(value: string): string {
  const v = value.trim();
  let year = "";
  let month = "";
  let day = "";
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  const dmy = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(v);
  if (iso) {
    year = iso[1];
    month = iso[2];
    day = iso[3];
  } else if (dmy) {
    year = dmy[3];
    month = dmy[2].padStart(2, "0");
    day = dmy[1].padStart(2, "0");
  } else {
    return "";
  }
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return "";
  return `${year}-${month}-${day}`;
}

/** YYMMDD de la MRZ → ISO. Naissance : siècle le plus récent qui n'est pas dans le futur. */
export function mrzDateToIso(yymmdd: string, kind: "birth" | "expiry"): string {
  if (!/^\d{6}$/.test(yymmdd)) return "";
  const yy = Number(yymmdd.slice(0, 2));
  const month = yymmdd.slice(2, 4);
  const day = yymmdd.slice(4, 6);
  let year = 2000 + yy;
  if (kind === "birth") {
    const candidate = Date.UTC(year, Number(month) - 1, Number(day));
    if (candidate > Date.now()) year = 1900 + yy;
  }
  return toIsoDate(`${year}-${month}-${day}`);
}

export function isoToSheetDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return "";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export function toNationality(value: string): string {
  const v = value.trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(v)) return v;
  const token = v.match(/\b[A-Z]{3}\b/);
  return token ? token[0] : "";
}

export function toSex(value: string): IdentitySex | "" {
  const v = value.trim().toUpperCase();
  if (v === "M" || v === "MALE" || v === "H") return "M";
  if (v === "F" || v === "FEMALE") return "F";
  return "";
}

export function toDocType(value: string): IdentityDocType | "" {
  const v = value.trim().toUpperCase();
  if (v === "PP" || v === "P" || v === "PASSPORT" || v === "PASSEPORT") return "PP";
  if (v === "CNI" || v === "ID" || v === "I" || v === "CARTE" || v === "IDENTITY") return "CNI";
  return "";
}

export function docTypeFromMrzCode(code: string): IdentityDocType | "" {
  const v = code.trim().toUpperCase();
  if (!v) return "";
  if (v.startsWith("P")) return "PP";
  return "CNI";
}

export function isExpiryPast(iso: string, today = new Date()): boolean {
  const date = toIsoDate(iso);
  if (!date) return false;
  const end = new Date(`${date}T23:59:59Z`);
  return end.getTime() < Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
}

/**
 * Première ligne dont le nom (C) et le numéro (I) sont vides.
 * Même numéro déjà présent : on réécrit cette ligne.
 * Modèle plein : on ajoute après la dernière ligne et on numérote la colonne A.
 */
export function pickManifestTarget(rows: ManifestScanRow[], docNumber: string): ManifestTarget {
  const wanted = normalizeDocNumber(docNumber);
  if (wanted) {
    const existing = rows.find((r) => normalizeDocNumber(r.docNumber) === wanted);
    if (existing) return { rowNumber: existing.rowNumber, numberToWrite: null };
  }

  const empty = rows.find((r) => !r.lastName.trim() && !normalizeDocNumber(r.docNumber));
  if (empty) return { rowNumber: empty.rowNumber, numberToWrite: null };

  const lastRow =
    rows.length > 0 ? rows[rows.length - 1].rowNumber : MANIFEST_DATA_START_ROW - 1;
  let maxN = 0;
  for (const r of rows) {
    const n = Number.parseInt(r.numberCell, 10);
    if (Number.isFinite(n) && n > maxN) maxN = n;
  }
  const nextNumber = maxN > 0 ? maxN + 1 : rows.length + 1;
  return { rowNumber: lastRow + 1, numberToWrite: String(nextNumber) };
}

/** Valeurs lues sur A:K à partir de la ligne 7. */
export function scanRowsFromSheet(values: string[][]): ManifestScanRow[] {
  return values.map((cells, i) => ({
    rowNumber: MANIFEST_DATA_START_ROW + i,
    numberCell: String(cells?.[0] ?? "").trim(),
    lastName: String(cells?.[2] ?? "").trim(),
    docNumber: String(cells?.[8] ?? "").trim(),
  }));
}
