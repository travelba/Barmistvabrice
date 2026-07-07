/**
 * Configuration centrale de l'evenement.
 * Les valeurs non sensibles (dates, prix vol, coordonnees) sont editables ici.
 * Les secrets (Stripe, Supabase, Google, Resend) restent dans les variables d'environnement.
 */

export const EVENT = {
  childName: "Shon Bechet",
  title: "Bar Mitsvah de Shon Bechet",
  /** Mise des Tephilines a Paris (date de l'evenement religieux). */
  tephilinesDate: "2026-10-08T09:30:00+02:00",
  tephilinesPlace: "Synagogue Buffault",
  tephilinesAddress: "28 rue Buffault, 75009 Paris",
  /** Sejour a Mykonos : depart vendredi 9 oct, retour dimanche 11 oct 2026 (2 nuits). */
  destination: "Mykonos",
  tripStartDate: "2026-10-09",
  tripEndDate: "2026-10-11",
  agencyName: "Travel BA — Conciergerie de Luxe",
  agencyEmail: "concierge@travelba.example",
} as const;

/** Nombre de nuits du sejour (vendredi 9 -> dimanche 11 octobre = 2 nuits). */
export const TRIP_NIGHTS = 2;

/**
 * Vol prive affrete : prix fixe par passager (en centimes d'euro).
 * 890 EUR aller-retour par personne (Boeing 737-800).
 * Identite "compagnie privee" facon billet d'embarquement.
 */
export const FLIGHT = {
  pricePerPassengerCents: 89000, // 890,00 EUR A/R par personne
  airline: "Travel BA Private Airways",
  airlineBy: "by Travel BA — Conciergerie de Luxe",
  aircraft: "Boeing 737-800",
  carrierName: "Boeing 737-800 — vol privé affrété",
  origin: "Paris (Roissy CDG)",
  destination: "Mykonos",
  outboundDate: "2026-10-09T09:15:00+02:00",
  returnDate: "2026-10-11T19:30:00+03:00",

  /** Aller : Paris CDG -> Mykonos JMK. */
  outbound: {
    flightNo: "TB 0910",
    fromCode: "CDG",
    fromCity: "Paris Roissy",
    toCode: "JMK",
    toCity: "Mykonos",
    depTime: "09:15",
    arrTime: "13:30",
    dateLabel: "09 OCT 2026",
    boarding: "08:35",
  },
  /** Retour : Mykonos JMK -> Paris CDG. */
  inbound: {
    flightNo: "TB 1011",
    fromCode: "JMK",
    fromCity: "Mykonos",
    toCode: "CDG",
    toCity: "Paris Roissy",
    depTime: "19:30",
    arrTime: "22:30",
    dateLabel: "11 OCT 2026",
    boarding: "18:50",
  },
} as const;

export const CURRENCY = "eur" as const;

/**
 * Duree (en minutes) du "hold" initial pose sur les places au moment du checkout.
 * Note : depuis la migration 0003, une reservation "pending" bloque ses places
 * tant qu'elle n'est pas annulee depuis le back-office (pas d'expiration auto) —
 * cette duree sert de reference pour la relance de paiement admin.
 */
export const HOLD_DURATION_MINUTES = 20;

/**
 * Mode demo actif quand Supabase/Stripe ne sont pas configures (preview local).
 * On exige la cle service_role car TOUT l'acces serveur passe par getSupabaseAdmin().
 * (Verifier l'anon key seule ferait croire que Supabase est dispo et planterait.)
 */
export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export const isStripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

/** Domaine de production canonique (URLs de retour Stripe, partage, e-mails). */
export const CANONICAL_URL = "https://barmistvabrice.vercel.app";

export function appUrl(): string {
  // 1. Variable explicite si definie.
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  // 2. En production Vercel : domaine propre (evite l'URL ...-travelba.vercel.app).
  if (process.env.VERCEL_ENV === "production") return CANONICAL_URL;
  // 3. Preview Vercel : URL du deploiement courant.
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  // 4. Local.
  return "http://localhost:3000";
}
