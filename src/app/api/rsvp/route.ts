import { NextResponse } from "next/server";
import { z } from "zod";
import { createCeremonyRsvp } from "@/lib/data";
import { appendRsvpToSheet } from "@/lib/sheets";
import { sendRsvpAgencyEmail } from "@/lib/email";
import { sendRsvpWhatsapp } from "@/lib/whatsapp";
import { defaultCountryForLocale, normalizePhoneE164 } from "@/lib/phone";

export const dynamic = "force-dynamic";

const personSchema = z.object({
  nom: z.string().min(1),
  prenom: z.string().min(1),
});

// Le formulaire "Réponse" (clone bm-shon-bechet) n'envoie que des noms/prénoms.
// On garde la compatibilité avec l'ancien format (name/email/phone) au cas où.
const schema = z.object({
  attending: z.boolean(),
  partySize: z.number().int().min(0).max(50).optional(),
  persons: z.array(personSchema).optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  guestCount: z.number().int().min(0).max(50).optional(),
  locale: z.enum(["fr", "he"]).optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const data = parsed.data;
  const locale = data.locale ?? "fr";

  // Normalisation : on construit un nom lisible à partir des participants.
  let name: string;
  let guestCount: number;
  if (data.persons && data.persons.length > 0) {
    name = data.persons
      .map((p) => `${p.prenom} ${p.nom}`.trim())
      .filter(Boolean)
      .join(", ");
    guestCount = data.partySize ?? data.persons.length;
  } else {
    name = data.name ?? "";
    guestCount = data.guestCount ?? (data.attending ? 1 : 0);
  }
  if (!name) name = data.attending ? "Invité(e)" : "Réponse : absent(e)";

  const email = data.email ?? "";
  // Normalisation E.164 selon la langue de la page (FR -> +33, HE -> +972) ;
  // on conserve la saisie brute si elle n'est pas normalisable.
  const rawPhone = data.phone ?? "";
  const phone = normalizePhoneE164(rawPhone, defaultCountryForLocale(locale)) ?? rawPhone;

  try {
    const rsvp = await createCeremonyRsvp({
      name,
      email,
      phone,
      attending: data.attending,
      guestCount: data.attending ? guestCount : 0,
      source: "ceremony",
    });

    // Notifications best-effort (n'echouent pas la requete) :
    //  - confirmation a l'invite par WhatsApp
    //  - notification a l'agence par e-mail
    //  - trace dans le Google Sheet
    await Promise.allSettled([
      appendRsvpToSheet(rsvp),
      sendRsvpAgencyEmail(rsvp, locale),
      sendRsvpWhatsapp(rsvp, locale),
    ]).then((results) =>
      results.forEach((r) => {
        if (r.status === "rejected") console.error("[rsvp]", r.reason);
      }),
    );

    return NextResponse.json({ ok: true, id: rsvp.id });
  } catch (e) {
    console.error("[rsvp] error", e);
    return NextResponse.json({ error: "Erreur lors de l'enregistrement" }, { status: 500 });
  }
}
