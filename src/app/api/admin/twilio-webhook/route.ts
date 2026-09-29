import { timingSafeEqual } from "node:crypto";
import { adminPassword } from "@/lib/admin-auth";
import { connectWhatsappInbound, readWhatsappInbound } from "@/lib/twilio-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { password?: string; read?: boolean } | null;
  const given = body?.password ?? "";
  const expected = adminPassword();
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = body?.read ? await readWhatsappInbound() : await connectWhatsappInbound();
    return Response.json(result);
  } catch (e) {
    console.error("[twilio-webhook]", e instanceof Error ? e.name : "error");
    return Response.json({ error: "twilio" }, { status: 503 });
  }
}
