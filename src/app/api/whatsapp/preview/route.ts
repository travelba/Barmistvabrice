import { NextResponse } from "next/server";
import { runCeremonyPreview } from "@/lib/ceremony-preview";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Renvoie le rappel cérémonie J-1 au 07 72 15 82 57 via le template approuvé
 * reminder_ceremony_j1_fr (ContentSid + ContentVariables). Pas de Body libre.
 *
 * Authorization: Bearer $WHATSAPP_PREVIEW_SECRET
 * {"to":"+33772158257","name":"LES AMIS"}
 * Ajouter "dryRun": true pour voir les variables sans appeler Twilio.
 */
export async function POST(req: Request) {
  let payload: unknown = null;
  const text = await req.text();
  if (text.trim()) {
    try {
      payload = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
    }
  }
  const result = await runCeremonyPreview({
    authorization: req.headers.get("authorization"),
    payload,
    env: process.env,
  });
  return NextResponse.json(result.body, { status: result.status });
}
