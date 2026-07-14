import { NextResponse } from "next/server";
import { runRemindersForSlot, type CronSlot } from "@/lib/reminders";
import type { ReminderKind } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const VALID_SLOTS = new Set<CronSlot>(["morning", "evening"]);
const VALID_FORCE = new Set<ReminderKind>(["global_j7", "ceremony_j1", "trip_j1"]);

/**
 * Cron Vercel — rappels WhatsApp J-7 / J-1 (option C).
 * morning (08:00 UTC = 10:00 Paris) : global_j7
 * evening (16:00 UTC = 18:00 Paris) : ceremony_j1, trip_j1
 *
 * Test manuel (avec CRON_SECRET) :
 *   GET /api/cron/reminders?slot=morning&dryRun=1
 *   GET /api/cron/reminders?slot=evening&force=trip_j1&dryRun=1
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET non configuré" }, { status: 503 });
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const params = new URL(req.url).searchParams;
  const slotParam = params.get("slot");
  if (!slotParam || !VALID_SLOTS.has(slotParam as CronSlot)) {
    return NextResponse.json({ error: "Paramètre slot=morning|evening requis" }, { status: 400 });
  }
  const slot = slotParam as CronSlot;

  const forceParam = params.get("force");
  const force =
    forceParam && VALID_FORCE.has(forceParam as ReminderKind)
      ? (forceParam as ReminderKind)
      : undefined;

  const dryRun = params.get("dryRun") === "1";

  try {
    const payload = await runRemindersForSlot(slot, { dryRun, force });
    return NextResponse.json({ ok: true, dryRun, force: force ?? null, ...payload });
  } catch (e) {
    console.error("[api/cron/reminders]", e);
    const message = e instanceof Error ? e.message : "Erreur cron rappels";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
