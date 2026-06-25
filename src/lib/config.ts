/**
 * Configuration centrale de l'evenement.
 * Les valeurs non sensibles (dates, prix vol, coordonnees) sont editables ici.
 * Les secrets (Stripe, Supabase, Google, Resend) restent dans les variables d'environnement.
 */

import type { Locale } from "./types";

export const EVENT = {
  childName: "Shon Bechet",
  title: "Bar Mitsvah de Shon Bechet",
  /** Mise des Tephilines a Paris (date de l'evenement religieux). */
  tephilinesDate: "2026-10-08T09:00:00+02:00",
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

/**
 * Faire-part de la mise des Tephilines (affiche sur /ceremonie).
 * Contenu editorial bilingue : selectionne via la langue active.
 */
type InvitationContent = {
  hosts: string[];
  announce: string;
  specialThoughtLabel: string;
  specialThought: string;
  ceremonyTimeLabel: string;
  brunch: string;
};

export const INVITATION: Record<Locale, InvitationContent> = {
  fr: {
    hosts: [
      "M. et Mme Maurice & Maryvonne Bechet",
      "Limor & Brice",
      "Emy & Shay",
    ],
    announce:
      "ont la joie de vous faire part de la Bar Mitsvah de leur petit-fils, fils et frère",
    specialThoughtLabel: "Une pensée particulière pour",
    specialThought: "Asher & Myriam Elgrably",
    ceremonyTimeLabel: "à 9h précises",
    brunch: "Un brunch suivra l'office",
  },
  he: {
    hosts: [
      "מר וגב' מוריס ומריוון בשה",
      "לימור ובריס",
      "אמי ושי",
    ],
    announce:
      "שמחים לבשר לכם על בר המצווה של נכדם, בנם ואחיהם",
    specialThoughtLabel: "מחשבה מיוחדת ל",
    specialThought: "אשר ומרים אלגרבלי",
    ceremonyTimeLabel: "בשעה 9:00 בדיוק",
    brunch: "בראנץ' יתקיים לאחר התפילה",
  },
};

/**
 * Programme du sejour (affiche sur /voyage). Bilingue.
 */
type ProgramDay = {
  day: string;
  date: string;
  items: Array<{ time?: string; text: string }>;
};

export const PROGRAM: Record<Locale, ProgramDay[]> = {
  fr: [
    {
      day: "Vendredi",
      date: "9/10",
      items: [
        { time: "07h20", text: "Rendez-vous à l’aéroport Roissy Charles de Gaulle" },
        { time: "09h15", text: "Décollage à destination de Mykonos" },
        { time: "13h30", text: "Arrivée à Mykonos — transfert organisé vers l’hôtel Santa Marina" },
        { text: "Après-midi détente" },
        {
          time: "18h30",
          text: "Entrée de Shabbat, allumage des bougies et prière dans la Salle Blanche de l’hôtel Santa Marina",
        },
        { time: "20h00", text: "Dîner de Shabbat au restaurant ELAIS de l’hôtel Santa Marina" },
      ],
    },
    {
      day: "Samedi",
      date: "10/10",
      items: [
        { time: "08h00", text: "Ouverture du petit déjeuner" },
        { time: "09h00", text: "Office de Shabbat dans la Salle Blanche : lecture de la Torah" },
        { time: "13h00", text: "Déjeuner de Shabbat au restaurant ELAIS de l’hôtel Santa Marina" },
        { time: "15h30", text: "Liberté…" },
        { time: "19h20", text: "Havdala dans la villa du Bar Mitsvah" },
        { time: "20h30", text: "Apéritif autour de la piscine de l’hôtel" },
        { time: "21h30", text: "Soirée au BOUDDHA BAR BEACH" },
      ],
    },
    {
      day: "Dimanche",
      date: "11/10",
      items: [
        { time: "08h00", text: "Ouverture du petit déjeuner" },
        { time: "12h00", text: "Beach Party à la plage de l’hôtel Santa Marina" },
        { time: "17h30", text: "Transfert organisé vers l’aéroport de Mykonos" },
        { time: "19h30", text: "Décollage à destination de Roissy Charles de Gaulle" },
        { time: "22h30", text: "Arrivée Roissy Charles de Gaulle" },
      ],
    },
  ],
  he: [
    {
      day: "יום שישי",
      date: "9/10",
      items: [
        { time: "07:20", text: "מפגש בשדה התעופה רואסי שארל דה גול" },
        { time: "09:15", text: "המראה לכיוון מיקונוס" },
        { time: "13:30", text: "נחיתה במיקונוס — הסעה מאורגנת למלון סנטה מרינה" },
        { text: "אחר הצהריים — מנוחה" },
        {
          time: "18:30",
          text: "כניסת שבת, הדלקת נרות ותפילה באולם הלבן של מלון סנטה מרינה",
        },
        { time: "20:00", text: "ארוחת ערב שבת במסעדת ELAIS של מלון סנטה מרינה" },
      ],
    },
    {
      day: "שבת",
      date: "10/10",
      items: [
        { time: "08:00", text: "פתיחת ארוחת הבוקר" },
        { time: "09:00", text: "תפילת שבת באולם הלבן: קריאת התורה" },
        { time: "13:00", text: "ארוחת צהריים של שבת במסעדת ELAIS של מלון סנטה מרינה" },
        { time: "15:30", text: "זמן חופשי…" },
        { time: "19:20", text: "הבדלה בווילה של הבר מצווה" },
        { time: "20:30", text: "קוקטייל סביב בריכת המלון" },
        { time: "21:30", text: "מסיבה ב-BOUDDHA BAR BEACH" },
      ],
    },
    {
      day: "יום ראשון",
      date: "11/10",
      items: [
        { time: "08:00", text: "פתיחת ארוחת הבוקר" },
        { time: "12:00", text: "מסיבת חוף בחוף של מלון סנטה מרינה" },
        { time: "17:30", text: "הסעה מאורגנת לשדה התעופה של מיקונוס" },
        { time: "19:30", text: "המראה לכיוון רואסי שארל דה גול" },
        { time: "22:30", text: "נחיתה ברואסי שארל דה גול" },
      ],
    },
  ],
};

export const CURRENCY = "eur" as const;

/**
 * Duree (en minutes) d'un "hold" sur les places pendant le tunnel de paiement.
 * Au-dela, les places sont liberees automatiquement si le paiement n'aboutit pas.
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

export function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}
