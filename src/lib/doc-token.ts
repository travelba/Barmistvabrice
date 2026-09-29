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

/**
 * Nom de fichier signé du carnet de voyage (se termine en .pdf : exigé par
 * WhatsApp/Meta pour les templates média, plus lisible pour l'invité).
 */
export function bookingDocsFileName(bookingId: string): string {
  return `carnet_${bookingId}_${signBookingDocToken(bookingId)}.pdf`;
}

/** Analyse un nom de fichier carnet_<bookingId>_<token>.pdf (null si invalide). */
export function parseBookingDocsFileName(
  file: string,
): { bookingId: string; token: string } | null {
  const m = /^carnet_([0-9a-fA-F-]{8,64})_([0-9a-f]{32})\.pdf$/.exec(file);
  return m ? { bookingId: m[1], token: m[2] } : null;
}

/** Chemin relatif signé vers le PDF d'une réservation. */
export function bookingDocsPath(bookingId: string): string {
  return `/api/documents/${bookingDocsFileName(bookingId)}`;
}

/**
 * Jeton distinct du carnet PDF : le lien /pieces ne doit pas être forgeable
 * à partir du lien de téléchargement, ni l'inverse.
 */
export function signIdentityToken(bookingId: string): string {
  return createHmac("sha256", secret()).update(`identity:${bookingId}`).digest("hex").slice(0, 32);
}

export function verifyIdentityToken(bookingId: string, token: string | null): boolean {
  if (!token || !/^[0-9a-f]{32}$/.test(token)) return false;
  const expected = Buffer.from(signIdentityToken(bookingId));
  const provided = Buffer.from(token);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

/** Chemin relatif signé vers la page d'envoi des pièces d'identité. */
export function identityPagePath(bookingId: string, lang?: "fr" | "he"): string {
  const q = new URLSearchParams({
    booking_id: bookingId,
    token: signIdentityToken(bookingId),
  });
  if (lang) q.set("lang", lang);
  return `/pieces?${q.toString()}`;
}
