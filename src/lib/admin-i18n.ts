/**
 * i18n du back-office (/admin) : indépendant du provider client public.
 * La langue vient du paramètre d'URL ?lang=he (français par défaut).
 */

export type AdminLang = "fr" | "he";

const FR = {
  "header.kicker": "Espace agence",
  "header.export": "Export CSV",
  "header.logout": "Déconnexion",
  "header.lang": "עברית",

  "demo.notice":
    "Mode démonstration (Supabase non configuré) — les données ne sont pas persistées entre les redémarrages du serveur.",

  "kpi.paid": "Réservations payées",
  "kpi.passengers": "Passagers (vols)",
  "kpi.ceremony": "Présents cérémonie",
  "kpi.revenue": "Chiffre d'affaires",

  "stock.title": "Places restantes",
  "stock.remaining": "restantes",
  "stock.room": "Chambre",
  "stock.capacity": "Cap.",
  "stock.stock": "Stock",
  "stock.booked": "Réservées",
  "stock.available": "Dispo",

  "bookings.title": "Inscriptions",
  "bookings.date": "Date",
  "bookings.group": "Groupe",
  "bookings.contact": "Contact",
  "bookings.hotel": "Hôtel",
  "bookings.pax": "Pax",
  "bookings.total": "Total",
  "bookings.status": "Statut",
  "bookings.actions": "Actions",
  "bookings.empty": "Aucune inscription pour le moment.",

  "status.paid": "Payé",
  "status.pending": "En attente",
  "status.cancelled": "Annulé",
  "status.expired": "Expiré",

  "actions.relaunch": "Relancer",
  "actions.release": "Libérer",
  "actions.confirmRelease": "Libérer la place ? La réservation sera annulée.",
  "actions.copy": "Copier le lien",
  "actions.error": "Erreur",

  "rsvp.title": "Mise des Téphilines — RSVP",
  "rsvp.subtitle":
    "Réponses reçues via le lien cérémonie (hors voyageurs, comptés dans les inscriptions).",
  "rsvp.name": "Nom",
  "rsvp.answer": "Réponse",
  "rsvp.guests": "Personnes",
  "rsvp.present": "Présent",
  "rsvp.absent": "Absent",
  "rsvp.empty": "Aucune réponse pour le moment.",

  "login.title": "Espace agence",
  "login.subtitle": "Accès réservé à l'administration.",
  "login.password": "Mot de passe",
  "login.submit": "Se connecter",
  "login.error": "Erreur",
};

const HE: Record<AdminKey, string> = {
  "header.kicker": "אזור הסוכנות",
  "header.export": "ייצוא CSV",
  "header.logout": "התנתקות",
  "header.lang": "Français",

  "demo.notice":
    "מצב הדגמה (Supabase לא מוגדר) — הנתונים אינם נשמרים בין הפעלות השרת.",

  "kpi.paid": "הזמנות ששולמו",
  "kpi.passengers": "נוסעים (טיסות)",
  "kpi.ceremony": "נוכחים בטקס",
  "kpi.revenue": "מחזור",

  "stock.title": "מקומות פנויים",
  "stock.remaining": "נותרו",
  "stock.room": "חדר",
  "stock.capacity": "קיבולת",
  "stock.stock": "מלאי",
  "stock.booked": "הוזמנו",
  "stock.available": "פנוי",

  "bookings.title": "הרשמות",
  "bookings.date": "תאריך",
  "bookings.group": "קבוצה",
  "bookings.contact": "איש קשר",
  "bookings.hotel": "מלון",
  "bookings.pax": "נוסעים",
  "bookings.total": "סה\"כ",
  "bookings.status": "סטטוס",
  "bookings.actions": "פעולות",
  "bookings.empty": "אין הרשמות כרגע.",

  "status.paid": "שולם",
  "status.pending": "ממתין",
  "status.cancelled": "בוטל",
  "status.expired": "פג תוקף",

  "actions.relaunch": "שליחה מחדש",
  "actions.release": "שחרור",
  "actions.confirmRelease": "לשחרר את המקום? ההזמנה תבוטל.",
  "actions.copy": "העתקת הקישור",
  "actions.error": "שגיאה",

  "rsvp.title": "הנחת תפילין — אישורי הגעה",
  "rsvp.subtitle": "תשובות שהתקבלו דרך קישור הטקס (לא כולל נוסעים, הנספרים בהרשמות).",
  "rsvp.name": "שם",
  "rsvp.answer": "תשובה",
  "rsvp.guests": "אנשים",
  "rsvp.present": "נוכח",
  "rsvp.absent": "נעדר",
  "rsvp.empty": "אין תשובות כרגע.",

  "login.title": "אזור הסוכנות",
  "login.subtitle": "הגישה שמורה להנהלה בלבד.",
  "login.password": "סיסמה",
  "login.submit": "התחברות",
  "login.error": "שגיאה",
};

export type AdminKey = keyof typeof FR;

const DICTS: Record<AdminLang, Record<AdminKey, string>> = { fr: FR, he: HE };

export function resolveAdminLang(value: string | undefined): AdminLang {
  return value === "he" ? "he" : "fr";
}

export function adminT(lang: AdminLang): (key: AdminKey) => string {
  return (key) => DICTS[lang][key];
}

export function adminDateLocale(lang: AdminLang): string {
  return lang === "he" ? "he-IL" : "fr-FR";
}
