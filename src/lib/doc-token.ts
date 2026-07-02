import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Jeton signé (HMAC-SHA256) protégeant le téléchargement du carnet de voyage
 * (/api/documents). Le lien est partagé par WhatsApp et sur la page de
 * confirmation : sans ce jeton, connaître un booking_id suffirait à
 * télécharger les données personnelles (noms, dates de naissance).
 *
 * Le secret dédié DOCS_TOKEN_SECRET est optionnel : on retombe sur
 * ADMIN_SECRET, déjà requis en production.
 */

function secret(): string {
  return process.env.DOCS_TOKEN_SECRET || process.env.ADMIN_SECRET || "bmsb-secret";
}

export function signBookingDocToken(bookingId: string): string {
  return createHmac("sha256", secret()).update(bookingId).digest("hex").slice(0, 32);
}

export function verifyBookingDocToken(bookingId: string, token: string | null): boolean {
  if (!token) return false;
  const expected = Buffer.from(signBookingDocToken(bookingId));
  const provided = Buffer.from(token);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

/** Chemin relatif signé vers le PDF d'une réservation. */
export function bookingDocsPath(bookingId: string): string {
  return `/api/documents?booking_id=${encodeURIComponent(bookingId)}&token=${signBookingDocToken(bookingId)}`;
}
