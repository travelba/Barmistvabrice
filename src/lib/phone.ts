import type { Locale } from "./types";

/**
 * Normalisation des numeros de telephone en E.164 (+33612345678, +972501234567).
 *
 * Source unique de verite partagee par les formulaires (validation client),
 * les API (validation + stockage serveur) et l'envoi WhatsApp — le meme numero
 * est donc interprete de la meme facon partout.
 *
 * Le pays par defaut depend de la langue de la page : les invites des pages
 * hebreu saisissent generalement un numero israelien national (05X...),
 * ceux des pages francaises un numero francais (06/07...).
 */

/** Indicatif pays par defaut selon la langue de la page. */
export function defaultCountryForLocale(locale: Locale | undefined): string {
  return locale === "he" ? "972" : "33";
}

/**
 * Normalise une saisie libre en E.164.
 * - "+33 6 12 34 56 78", "0033612345678" -> "+33612345678" (international explicite)
 * - "06 12 34 56 78" + pays 33            -> "+33612345678"
 * - "050-123-4567"  + pays 972            -> "+972501234567"
 * Retourne null si le numero est invalide.
 */
export function normalizePhoneE164(raw: string, defaultCountry = "33"): string | null {
  if (!raw) return null;
  let n = raw.trim().replace(/[\s().\u2010-\u2015-]/g, "");
  if (n.startsWith("+")) {
    n = "+" + n.slice(1).replace(/\D/g, "");
  } else if (n.startsWith("00")) {
    n = "+" + n.slice(2).replace(/\D/g, "");
  } else {
    const digits = n.replace(/\D/g, "");
    if (!digits) return null;
    if (digits.startsWith("0")) {
      // Numero national : on retire le 0 initial et on prefixe l'indicatif.
      n = `+${defaultCountry}${digits.slice(1)}`;
    } else if (digits.startsWith(defaultCountry) && digits.length >= 10) {
      // Saisie "33612345678" / "972501234567" sans le +.
      n = `+${digits}`;
    } else if (digits.length >= 8 && digits.length <= 10) {
      // Numero national sans 0 initial (ex. "612345678").
      n = `+${defaultCountry}${digits}`;
    } else {
      return null;
    }
  }
  // E.164 : + suivi de 8 a 15 chiffres.
  if (!/^\+\d{8,15}$/.test(n)) return null;
  // Garde-fous par pays sur la longueur du numero national.
  if (n.startsWith("+33") && n.length !== 12) return null; // +33 + 9 chiffres
  if (n.startsWith("+972") && (n.length < 12 || n.length > 13)) return null; // +972 + 8-9 chiffres
  return n;
}

/** Validation simple pour les formulaires. */
export function isValidPhone(raw: string, defaultCountry = "33"): boolean {
  return normalizePhoneE164(raw, defaultCountry) !== null;
}

/** Exemple de saisie affiche dans les formulaires selon la langue. */
export function phonePlaceholder(locale: Locale | undefined): string {
  return locale === "he" ? "05X-XXX-XXXX" : "06 12 34 56 78";
}
