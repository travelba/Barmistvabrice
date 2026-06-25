import { NextResponse } from "next/server";
import { z } from "zod";
import { createCeremonyRsvp } from "@/lib/data";
import { appendRsvpToSheet } from "@/lib/sheets";
import { sendRsvpEmails } from "@/lib/email";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6),
  attending: z.boolean(),
  guestCount: z.number().int().min(1).max(50),
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

  try {
    const { locale = "fr", ...rsvpData } = parsed.data;
    const rsvp = await createCeremonyRsvp({
      ...rsvpData,
      // Si la personne ne vient pas, on enregistre 0 accompagnant.
      guestCount: rsvpData.attending ? rsvpData.guestCount : 0,
      source: "ceremony",
    });

    // Notifications best-effort (n'echouent pas la requete).
    await Promise.allSettled([appendRsvpToSheet(rsvp), sendRsvpEmails(rsvp, locale)]).then((results) =>
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
