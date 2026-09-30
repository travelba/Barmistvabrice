import { parse as parseMRZ, type Details, type ParseResult } from "mrz";
import {
  docTypeFromMrzCode,
  foldName,
  mrzDateToIso,
  normalizeDocNumber,
  toDocType,
  toIsoDate,
  toNationality,
  toSex,
  type IdentityFields,
} from "./identity-manifest";

function cleanMrzLine(line: string): string {
  return line.toUpperCase().replace(/[^A-Z0-9<]/g, "");
}

/** Découpe une MRZ renvoyée en une seule chaîne ou avec des espaces. */
export function splitMrzLines(raw: string[]): string[] {
  const pieces = raw
    .flatMap((line) => line.split(/[\r\n]+/))
    .map(cleanMrzLine)
    .filter((line) => line.length >= 28);

  if (pieces.length === 1) {
    const line = pieces[0];
    if (line.length === 90) {
      return [line.slice(0, 30), line.slice(30, 60), line.slice(60, 90)];
    }
    if (line.length === 72) {
      return [line.slice(0, 36), line.slice(36, 72)];
    }
    if (line.length >= 86 && line.length <= 89) {
      return [fitLength(line.slice(0, 44), 44), fitLength(line.slice(44), 44)];
    }
  }

  return pieces.slice(0, 3).map((line) => {
    if (line.length >= 42 && line.length <= 46) return fitLength(line, 44);
    if (line.length >= 28 && line.length <= 32) return fitLength(line, 30);
    if (line.length >= 34 && line.length <= 38) return fitLength(line, 36);
    return line;
  });
}

function detailOk(details: Details[], field: string): boolean | null {
  const row = details.find((d) => d.field === field);
  if (!row) return null;
  return row.valid;
}

/** La librairie vide la nationalité si le code n'est pas dans sa liste, même si les checksums passent. */
function nationalityFromMrz(parsed: ParseResult, lines: string[]): string {
  const fromField = toNationality(String(parsed.fields.nationality ?? ""));
  if (fromField) return fromField;
  let raw = "";
  if ((parsed.format === "TD3" || parsed.format === "TD2") && lines[1]) raw = lines[1].slice(10, 13);
  else if (parsed.format === "TD1" && lines[1]) raw = lines[1].slice(15, 18);
  else if (parsed.format === "FRENCH_NATIONAL_ID" && lines[0]) raw = lines[0].slice(2, 5);
  return toNationality(raw.replace(/</g, ""));
}

function cleanPersonName(value: unknown): string {
  return String(value ?? "")
    .replace(/[,;/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fitLength(line: string, size: number): string {
  if (line.length === size) return line;
  if (line.length > size) return line.slice(0, size);
  return line.padEnd(size, "<");
}

/**
 * Si la MRZ a des checksums valides, elle remplace numéro, dates, sexe,
 * nationalité et type. Les noms gardent la graphie lue (accents).
 */
export function applyMrz(
  visual: IdentityFields,
  rawLines: string[],
): { fields: IdentityFields; warnings: string[] } {
  const fields: IdentityFields = { ...visual };
  const lines = splitMrzLines(rawLines);
  if (lines.length === 0) {
    return { fields, warnings: ["mrz_unreadable"] };
  }

  let parsed: ReturnType<typeof parseMRZ>;
  try {
    parsed = parseMRZ(lines, { autocorrect: true });
  } catch {
    return { fields, warnings: ["mrz_unreadable"] };
  }

  const warnings: string[] = [];
  const numberOk = Boolean(parsed.documentNumber) && detailOk(parsed.details, "documentNumberCheckDigit") === true;
  if (!numberOk) warnings.push("mrz_invalid");
  if (numberOk && detailOk(parsed.details, "compositeCheckDigit") === false) warnings.push("mrz_invalid");
  if (numberOk && parsed.documentNumber) fields.docNumber = normalizeDocNumber(parsed.documentNumber);

  if (detailOk(parsed.details, "birthDateCheckDigit") === true) {
    const birth = mrzDateToIso(String(parsed.fields.birthDate ?? ""), "birth");
    if (birth) fields.dateOfBirth = birth;
  }
  if (detailOk(parsed.details, "expirationDateCheckDigit") === true) {
    const expiry = mrzDateToIso(String(parsed.fields.expirationDate ?? ""), "expiry");
    if (expiry) fields.expiryDate = expiry;
  }

  if (numberOk) {
    const sex = toSex(String(parsed.fields.sex ?? ""));
    if (sex) fields.sex = sex;

    const nationality = nationalityFromMrz(parsed, lines);
    if (nationality) fields.nationality = nationality;

    const docType = docTypeFromMrzCode(String(parsed.fields.documentCode ?? ""));
    if (docType) fields.docType = docType;
  }

  const mrzLast = String(parsed.fields.lastName ?? "").trim();
  const mrzFirst = String(parsed.fields.firstName ?? "").trim();
  if (!fields.lastName && mrzLast) fields.lastName = mrzLast;
  if (!fields.firstName && mrzFirst) fields.firstName = mrzFirst;
  const lastDiff =
    fields.lastName && mrzLast && foldName(fields.lastName) !== foldName(mrzLast);
  const firstDiff =
    fields.firstName && mrzFirst && foldName(fields.firstName) !== foldName(mrzFirst);
  if (lastDiff || firstDiff) warnings.push("name_mismatch");

  return { fields, warnings };
}

export function normalizeVisualFields(input: {
  sex?: string;
  lastName?: string;
  firstName?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  docType?: string;
  docNumber?: string;
  nationality?: string;
  expiryDate?: string;
  specifications?: string;
}): IdentityFields {
  return {
    sex: toSex(String(input.sex ?? "")),
    lastName: cleanPersonName(input.lastName),
    firstName: cleanPersonName(input.firstName),
    dateOfBirth: toIsoDate(String(input.dateOfBirth ?? "")),
    placeOfBirth: String(input.placeOfBirth ?? "").replace(/\s+/g, " ").trim(),
    docType: toDocType(String(input.docType ?? "")),
    docNumber: normalizeDocNumber(String(input.docNumber ?? "")),
    nationality: toNationality(String(input.nationality ?? "")),
    expiryDate: toIsoDate(String(input.expiryDate ?? "")),
    specifications: String(input.specifications ?? "").replace(/\s+/g, " ").trim(),
  };
}
