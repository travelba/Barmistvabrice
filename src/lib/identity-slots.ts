import {
  foldName,
  type IdentityDocType,
  type IdentitySex,
} from "./identity-manifest";
import type { Passenger } from "./types";

export type IdentityDocumentPublic = {
  id: string;
  bookingId: string;
  passengerIndex: number | null;
  sex: IdentitySex;
  lastName: string;
  firstName: string;
  dateOfBirth: string;
  placeOfBirth: string;
  docType: IdentityDocType;
  docNumber: string;
  nationality: string;
  expiryDate: string;
  specifications: string;
};

export type IdentitySlotSeed = {
  key: string;
  passengerIndex: number | null;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  saved: IdentityDocumentPublic | null;
};

/** Une carte par passager déjà connu, puis les documents du foyer qui n'y correspondent pas. */
export function buildIdentitySlots(
  passengers: Passenger[],
  docs: IdentityDocumentPublic[],
): IdentitySlotSeed[] {
  const used = new Set<string>();
  const slots: IdentitySlotSeed[] = passengers.map((p, i) => {
    const match =
      docs.find((d) => d.passengerIndex === i && !used.has(d.id)) ??
      docs.find(
        (d) =>
          !used.has(d.id) &&
          foldName(p.lastName).length > 0 &&
          foldName(d.lastName) === foldName(p.lastName) &&
          foldName(d.firstName) === foldName(p.firstName),
      );
    if (match) used.add(match.id);
    return {
      key: `p-${i}`,
      passengerIndex: i,
      firstName: p.firstName,
      lastName: p.lastName,
      dateOfBirth: p.dateOfBirth,
      saved: match ?? null,
    };
  });

  for (const doc of docs) {
    if (used.has(doc.id)) continue;
    slots.push({
      key: `d-${doc.id}`,
      passengerIndex: null,
      firstName: doc.firstName,
      lastName: doc.lastName,
      dateOfBirth: doc.dateOfBirth,
      saved: doc,
    });
  }
  return slots;
}
