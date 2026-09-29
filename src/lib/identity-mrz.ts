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

function checksumsOk(details: Details[]): boolean {
  const present = (field: string) => details.some((d) => d.field === field);
  const ok = (field: string) => details.some((d) => d.field === field && d.valid);
  if (!ok("documentNumberCheckDigit")) return false;
  if (present("birthDateCheckDigit") && !ok("birthDateCheckDigit")) return false;
  if (present("expirationDateCheckDigit") && !ok("expirationDateCheckDigit")) return false;
  if (present("compositeCheckDigit") && !ok("compositeCheckDigit")) return false;
  return true;
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

  if (!parsed.documentNumber || !checksumsOk(parsed.details)) {
    return { fields, warnings: ["mrz_invalid"] };
  }

  const warnings: string[] = [];
  fields.docNumber = normalizeDocNumber(parsed.documentNumber);

  const birth = mrzDateToIso(String(parsed.fields.birthDate ?? ""), "birth");
  if (birth) fields.dateOfBirth = birth;
  const expiry = mrzDateToIso(String(parsed.fields.expirationDate ?? ""), "expiry");
  if (expiry) fields.expiryDate = expiry;

  const sex = toSex(String(parsed.fields.sex ?? ""));
  if (sex) fields.sex = sex;

  const nationality = nationalityFromMrz(parsed, lines);
  if (nationality) fields.nationality = nationality;

  const docType = docTypeFromMrzCode(String(parsed.fields.documentCode ?? ""));
  if (docType) fields.docType = docType;

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
    lastName: String(input.lastName ?? "").replace(/\s+/g, " ").trim(),
    firstName: String(input.firstName ?? "").replace(/\s+/g, " ").trim(),
    dateOfBirth: toIsoDate(String(input.dateOfBirth ?? "")),
    placeOfBirth: String(input.placeOfBirth ?? "").replace(/\s+/g, " ").trim(),
    docType: toDocType(String(input.docType ?? "")),
    docNumber: normalizeDocNumber(String(input.docNumber ?? "")),
    nationality: toNationality(String(input.nationality ?? "")),
    expiryDate: toIsoDate(String(input.expiryDate ?? "")),
    specifications: String(input.specifications ?? "").replace(/\s+/g, " ").trim(),
  };
}
