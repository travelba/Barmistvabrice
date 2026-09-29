import { after } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { publicRequestUrl, verifyTwilioSignature } from "@/lib/twilio-signature";
import { planWhatsappInbound, twimlEmpty } from "@/lib/whatsapp-inbound";
import { claimInboundMessage } from "@/lib/whatsapp-pending";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim() ?? "";
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return twiml(twimlEmpty(), 400);
  }
  const params: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") params[key] = value;
  }

  const signature = req.headers.get("x-twilio-signature");
  if (!verifyTwilioSignature(authToken, signature, publicRequestUrl(req), params)) {
    return new Response("Signature invalide", { status: 403 });
  }
  if (!getSupabaseAdmin()) return twiml(twimlEmpty(), 503);

  const messageSid = params.MessageSid ?? "";
  if (messageSid) {
    const claim = await claimInboundMessage(messageSid);
    if (claim === "duplicate") return twiml(twimlEmpty());
    if (claim === "unavailable") return twiml(twimlEmpty(), 503);
  }

  const planned = await planWhatsappInbound(params);
  if (planned.job) {
    const job = planned.job;
    after(() => job().catch((e) => console.error("[whatsapp] job", e instanceof Error ? e.name : "error")));
  }
  return twiml(planned.xml);
}

function twiml(xml: string, status = 200): Response {
  return new Response(xml, {
    status,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}
