import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthed } from "@/lib/admin-auth";
import { deleteCeremonyRsvp } from "@/lib/data";

export const dynamic = "force-dynamic";

const schema = z.object({ rsvpId: z.string().min(1) });

/** Suppression definitive d'un RSVP ceremonie depuis le back-office. */
export async function POST(req: Request) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

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
    const deleted = await deleteCeremonyRsvp(parsed.data.rsvpId);
    if (!deleted) {
      return NextResponse.json({ error: "RSVP introuvable" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/admin/rsvps/delete]", e);
    const message = e instanceof Error ? e.message : "Erreur lors de la suppression";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
