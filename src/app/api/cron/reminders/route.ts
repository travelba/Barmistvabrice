import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Rappels automatiques J-7 / J-1 annulés.
 * Le cron Vercel est retiré de vercel.json. Cette route reste pour que
 * toute invocation résiduelle réponde sans envoyer de WhatsApp.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    disabled: true,
    reason: "Rappels WhatsApp automatiques annulés",
  });
}
