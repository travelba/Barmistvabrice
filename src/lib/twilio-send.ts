/**
 * Appels Messages de l'API Twilio, partagés par les templates WhatsApp.
 * Les journaux d'échec portent le code Twilio, le SID et le destinataire masqué.
 */

const API_BASE = "https://api.twilio.com/2010-04-01";

export type TwilioAuth = { accountSid: string; authToken: string };

export type TwilioSendResult = {
  ok: boolean;
  http: number;
  sid: string | null;
  code: number | null;
  message: string | null;
  status: string | null;
};

const TERMINAL_STATUSES = new Set(["delivered", "read", "failed", "undelivered", "canceled"]);

/** whatsapp:+33612345678 → whatsapp:+***5678 */
export function maskWhatsappRecipient(to: string): string {
  const digits = to.replace(/\D/g, "");
  const last4 = digits.slice(-4);
  return last4 ? `whatsapp:+***${last4}` : "whatsapp:+***";
}

function redactPhones(text: string): string {
  return text.replace(/\+\d{8,15}/g, (match) => `+***${match.slice(-4)}`);
}

export function logTwilioFailure(
  to: string,
  result: Pick<TwilioSendResult, "code" | "sid" | "message" | "http">,
): void {
  console.error("[whatsapp] echec envoi Twilio", {
    code: result.code,
    sid: result.sid,
    to: maskWhatsappRecipient(to),
    http: result.http,
    message: result.message ? redactPhones(result.message).slice(0, 300) : null,
  });
}

export function parseTwilioPayload(data: unknown): Omit<TwilioSendResult, "ok" | "http"> {
  const row = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const codeRaw = row.code ?? row.error_code;
  const code =
    typeof codeRaw === "number"
      ? codeRaw
      : typeof codeRaw === "string" && /^\d+$/.test(codeRaw)
        ? Number(codeRaw)
        : null;
  const messageRaw = row.message ?? row.error_message;
  return {
    sid: typeof row.sid === "string" ? row.sid : null,
    code,
    message: typeof messageRaw === "string" ? messageRaw : null,
    status: typeof row.status === "string" ? row.status : null,
  };
}

/** Corps d'un envoi template. Jamais de champ Body : hors fenêtre de 24 h, Meta refuse le texte libre. */
export function whatsappTemplateFields(opts: {
  to: string;
  from: string;
  contentSid: string;
  variables?: Record<string, string>;
}): URLSearchParams {
  const fields = new URLSearchParams();
  fields.set("To", opts.to);
  fields.set("From", opts.from.startsWith("whatsapp:") ? opts.from : `whatsapp:${opts.from}`);
  fields.set("ContentSid", opts.contentSid);
  if (opts.variables && Object.keys(opts.variables).length > 0) {
    fields.set("ContentVariables", JSON.stringify(opts.variables));
  }
  return fields;
}

function authHeader(auth: TwilioAuth): string {
  return `Basic ${Buffer.from(`${auth.accountSid}:${auth.authToken}`).toString("base64")}`;
}

export async function postTwilioMessage(
  auth: TwilioAuth,
  fields: URLSearchParams,
  fetchImpl: typeof fetch = fetch,
): Promise<TwilioSendResult> {
  const res = await fetchImpl(`${API_BASE}/Accounts/${auth.accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: authHeader(auth),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: fields,
  });
  const data = await res.json().catch(() => null);
  const parsed = parseTwilioPayload(data);
  const result: TwilioSendResult = { ok: res.ok, http: res.status, ...parsed };
  if (!res.ok) logTwilioFailure(fields.get("To") ?? "", result);
  return result;
}

export async function getTwilioMessage(
  auth: TwilioAuth,
  sid: string,
  fetchImpl: typeof fetch = fetch,
): Promise<TwilioSendResult> {
  const res = await fetchImpl(`${API_BASE}/Accounts/${auth.accountSid}/Messages/${sid}.json`, {
    headers: { Authorization: authHeader(auth) },
  });
  const data = await res.json().catch(() => null);
  const parsed = parseTwilioPayload(data);
  return {
    ok: res.ok,
    http: res.status,
    sid: parsed.sid ?? sid,
    code: parsed.code,
    message: parsed.message,
    status: parsed.status,
  };
}

/** Attend le statut final pour journaliser un refus asynchrone (ex. 63112) avec le SID. */
export async function pollTwilioMessage(opts: {
  auth: TwilioAuth;
  sid: string;
  to: string;
  attempts?: number;
  delayMs?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}): Promise<TwilioSendResult> {
  const attempts = opts.attempts ?? 6;
  const delayMs = opts.delayMs ?? 2000;
  const sleep = opts.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const fetchImpl = opts.fetchImpl ?? fetch;
  let last: TwilioSendResult | null = null;
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await sleep(delayMs);
    last = await getTwilioMessage(opts.auth, opts.sid, fetchImpl);
    if (last.status && TERMINAL_STATUSES.has(last.status)) break;
  }
  const failed = last?.status === "failed" || last?.status === "undelivered" || last?.code != null;
  if (last && failed) logTwilioFailure(opts.to, last);
  return last ?? { ok: false, http: 0, sid: opts.sid, code: null, message: null, status: null };
}
