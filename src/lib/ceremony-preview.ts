import { timingSafeEqual } from "node:crypto";
import { ceremonyJ1Variables } from "./reminder-copy";
import { normalizePhoneE164 } from "./phone";
import type { Locale } from "./types";
import {
  maskWhatsappRecipient,
  pollTwilioMessage,
  postTwilioMessage,
  whatsappTemplateFields,
  type TwilioAuth,
} from "./twilio-send";

/** Numéro du rappel libre qui a échoué (07 72 15 82 57). L'aperçu ne part que là. */
export const CEREMONY_PREVIEW_E164 = "+33772158257";
/** Formule du texte libre refusé (« LES AMIS, PETIT RAPPEL »). */
export const CEREMONY_PREVIEW_NAME = "LES AMIS";
/**
 * Template Utility approuvé reminder_ceremony_j1_fr.
 * TWILIO_WA_TEMPLATE_REMINDER_CEREMONY_J1_FR prime s'il est défini.
 */
export const CEREMONY_J1_FR_CONTENT_SID = "HX6ec170e8dad259518b4d3d056381fe72";

export function ceremonyJ1ContentSid(locale: Locale, env: NodeJS.ProcessEnv = process.env): string | null {
  const key =
    locale === "he"
      ? "TWILIO_WA_TEMPLATE_REMINDER_CEREMONY_J1_HE"
      : "TWILIO_WA_TEMPLATE_REMINDER_CEREMONY_J1_FR";
  const fromEnv = env[key]?.trim();
  if (fromEnv) return fromEnv;
  if (locale === "fr") return CEREMONY_J1_FR_CONTENT_SID;
  return null;
}

export type PreviewInput = {
  authorization: string | null;
  payload: unknown;
  env: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  attempts?: number;
  delayMs?: number;
};

function authorized(header: string | null, secret: string): boolean {
  const expected = `Bearer ${secret}`;
  const got = header ?? "";
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function readPayload(payload: unknown): { dryRun: boolean; name: string } | { error: string } {
  if (payload == null) return { dryRun: false, name: CEREMONY_PREVIEW_NAME };
  if (typeof payload !== "object" || Array.isArray(payload)) return { error: "JSON invalide" };
  const row = payload as Record<string, unknown>;
  if (row.to != null && String(row.to).trim() !== "") {
    const normalized = normalizePhoneE164(String(row.to), "33");
    if (normalized !== CEREMONY_PREVIEW_E164) {
      return { error: "Cet aperçu n'envoie le rappel qu'au numéro déjà utilisé" };
    }
  }
  let name = CEREMONY_PREVIEW_NAME;
  if (row.name != null) {
    if (typeof row.name !== "string") return { error: "name invalide" };
    const trimmed = row.name.trim().replace(/\s+/g, " ");
    if (!trimmed || trimmed.length > 40) return { error: "name invalide" };
    name = trimmed;
  }
  return { dryRun: row.dryRun === true, name };
}

/**
 * Rappel cérémonie à l'initiative de l'entreprise : toujours le template approuvé.
 * Le texte libre est refusé hors fenêtre de 24 h (ce numéro n'a rien envoyé depuis juillet).
 */
export async function runCeremonyPreview(
  input: PreviewInput,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const secret = input.env.WHATSAPP_PREVIEW_SECRET?.trim();
  if (!secret) return { status: 503, body: { error: "Aperçu non configuré" } };
  if (!authorized(input.authorization, secret)) {
    return { status: 401, body: { error: "Non autorisé" } };
  }

  const parsed = readPayload(input.payload);
  if ("error" in parsed) return { status: 400, body: { error: parsed.error } };

  const accountSid = input.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = input.env.TWILIO_AUTH_TOKEN?.trim();
  const fromRaw = input.env.TWILIO_WHATSAPP_FROM?.trim();
  if (!accountSid || !authToken || !fromRaw) {
    return { status: 503, body: { error: "Twilio non configuré" } };
  }

  const locale: Locale = "fr";
  const contentSid = ceremonyJ1ContentSid(locale, input.env);
  if (!contentSid) return { status: 503, body: { error: "Template cérémonie manquant" } };

  const variables = ceremonyJ1Variables(parsed.name, locale);
  const to = `whatsapp:${CEREMONY_PREVIEW_E164}`;
  const masked = maskWhatsappRecipient(to);
  const summary = {
    channel: "template" as const,
    contentSid,
    variables,
    to: masked,
  };

  if (parsed.dryRun) {
    return { status: 200, body: { ok: true, dryRun: true, ...summary } };
  }

  const auth: TwilioAuth = { accountSid, authToken };
  const fields = whatsappTemplateFields({ to, from: fromRaw, contentSid, variables });
  const fetchImpl = input.fetchImpl ?? fetch;
  const sent = await postTwilioMessage(auth, fields, fetchImpl);
  if (!sent.ok || !sent.sid) {
    return {
      status: 502,
      body: {
        ok: false,
        ...summary,
        sid: sent.sid,
        code: sent.code,
        message: sent.message,
        http: sent.http,
      },
    };
  }

  const outcome = await pollTwilioMessage({
    auth,
    sid: sent.sid,
    to,
    fetchImpl,
    sleep: input.sleep,
    attempts: input.attempts ?? 6,
    delayMs: input.delayMs ?? 2000,
  });
  const failed = outcome.status === "failed" || outcome.status === "undelivered" || outcome.code != null;
  return {
    status: failed ? 502 : 200,
    body: {
      ok: !failed,
      ...summary,
      sid: sent.sid,
      status: outcome.status,
      code: outcome.code,
      message: outcome.message,
    },
  };
}
