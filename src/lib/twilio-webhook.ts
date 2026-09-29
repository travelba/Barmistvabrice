const CALLBACK = "https://www.bm-shon-bechet.fr/api/whatsapp/inbound";

type TwilioAuth = { sid: string; token: string };

export type WebhookConnectResult = {
  senders: Array<{ id: string; number: string; http: number }>;
  services: Array<{ id: string; http: number }>;
};

export async function connectWhatsappInbound(): Promise<WebhookConnectResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim() ?? "";
  const token = process.env.TWILIO_AUTH_TOKEN?.trim() ?? "";
  if (!sid || !token) throw new Error("twilio");
  const auth = { sid, token };
  const senders = await updateSenders(auth);
  const services = await updateServices(auth);
  return { senders, services };
}

async function updateSenders(auth: TwilioAuth): Promise<WebhookConnectResult["senders"]> {
  const listed = await twilio(auth, "https://messaging.twilio.com/v2/Channels/Senders?Channel=whatsapp&PageSize=50");
  if (!listed.ok) return [];
  const body = (await listed.json().catch(() => null)) as { senders?: Array<Record<string, unknown>> } | null;
  const rows = body?.senders ?? [];
  const out: WebhookConnectResult["senders"] = [];
  for (const row of rows) {
    const id = String(row.sid ?? "");
    if (!id) continue;
    const updated = await twilio(auth, `https://messaging.twilio.com/v2/Channels/Senders/${id}`, {
      method: "POST",
      body: JSON.stringify({
        webhook: { callback_url: CALLBACK, callback_method: "POST" },
      }),
    });
    out.push({
      id,
      number: String(row.sender_id ?? ""),
      http: updated.status,
    });
  }
  return out;
}

async function updateServices(auth: TwilioAuth): Promise<WebhookConnectResult["services"]> {
  const listed = await twilio(auth, "https://messaging.twilio.com/v1/Services?PageSize=50");
  if (!listed.ok) return [];
  const body = (await listed.json().catch(() => null)) as { services?: Array<Record<string, unknown>> } | null;
  const rows = body?.services ?? [];
  const out: WebhookConnectResult["services"] = [];
  for (const row of rows) {
    const id = String(row.sid ?? "");
    if (!id) continue;
    const form = new URLSearchParams();
    form.set("InboundRequestUrl", CALLBACK);
    form.set("InboundMethod", "POST");
    const updated = await twilio(auth, `https://messaging.twilio.com/v1/Services/${id}`, {
      method: "POST",
      body: form,
      form: true,
    });
    out.push({ id, http: updated.status });
  }
  return out;
}

async function twilio(
  auth: TwilioAuth,
  url: string,
  init?: { method?: string; body?: BodyInit; form?: boolean },
): Promise<Response> {
  return fetch(url, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Basic ${Buffer.from(`${auth.sid}:${auth.token}`).toString("base64")}`,
      ...(init?.form
        ? { "Content-Type": "application/x-www-form-urlencoded" }
        : init?.body
          ? { "Content-Type": "application/json" }
          : {}),
    },
    body: init?.body,
  });
}
