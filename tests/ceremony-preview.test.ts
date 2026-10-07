import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  CEREMONY_J1_FR_CONTENT_SID,
  CEREMONY_PREVIEW_NAME,
  runCeremonyPreview,
} from "../src/lib/ceremony-preview";
import { ceremonyJ1Variables } from "../src/lib/reminder-copy";
import { maskWhatsappRecipient, whatsappTemplateFields } from "../src/lib/twilio-send";

const SID = "SM55a8a1a76505545699d90814eb09641a";

const env: NodeJS.ProcessEnv = {
  WHATSAPP_PREVIEW_SECRET: "preview-secret",
  TWILIO_ACCOUNT_SID: "AC00000000000000000000000000000000",
  TWILIO_AUTH_TOKEN: "test-token",
  TWILIO_WHATSAPP_FROM: "whatsapp:+15559811432",
  TWILIO_WA_TEMPLATE_REMINDER_CEREMONY_J1_FR: CEREMONY_J1_FR_CONTENT_SID,
};

const authHeader = "Bearer preview-secret";

function bodyText(body: BodyInit | null | undefined): string {
  if (typeof body === "string") return body;
  if (body instanceof URLSearchParams) return body.toString();
  return "";
}

function captureFetch(handler: (url: string, init?: RequestInit) => Response) {
  const calls: { url: string; method: string; body: string }[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    calls.push({
      url: String(input),
      method: init?.method ?? "GET",
      body: bodyText(init?.body),
    });
    return handler(String(input), init);
  };
  return { calls, fetchImpl };
}

const logs: unknown[][] = [];
const originalError = console.error;
function spyErrors() {
  logs.length = 0;
  console.error = (...args: unknown[]) => {
    logs.push(args);
  };
}

afterEach(() => {
  console.error = originalError;
});

describe("rappel cérémonie via template", () => {
  it("masque le destinataire et ne met pas de Body dans le formulaire", () => {
    assert.equal(maskWhatsappRecipient("whatsapp:+33772158257"), "whatsapp:+***8257");
    const fields = whatsappTemplateFields({
      to: "whatsapp:+33772158257",
      from: "whatsapp:+15559811432",
      contentSid: CEREMONY_J1_FR_CONTENT_SID,
      variables: ceremonyJ1Variables(CEREMONY_PREVIEW_NAME, "fr"),
    });
    assert.equal(fields.has("Body"), false);
    assert.equal(fields.get("ContentSid"), CEREMONY_J1_FR_CONTENT_SID);
    const variables = JSON.parse(fields.get("ContentVariables") ?? "{}") as Record<string, string>;
    assert.equal(variables["1"], "LES AMIS");
    assert.equal(variables["2"], "Shon Bechet");
    assert.match(variables["3"], /Grande Synagogue de la Victoire/);
    assert.match(variables["3"], /44 rue de la Victoire, 75009 Paris/);
    assert.match(variables["3"], /10h15/);
  });

  it("envoie ContentSid et ContentVariables, puis journalise 63112", async () => {
    spyErrors();
    const { calls, fetchImpl } = captureFetch((_url, init) => {
      if (init?.method === "POST") {
        return Response.json({ sid: SID, status: "queued" });
      }
      return Response.json({
        sid: SID,
        status: "failed",
        error_code: 63112,
        error_message: "Channel error for +33772158257",
        to: "whatsapp:+33772158257",
      });
    });

    const result = await runCeremonyPreview({
      authorization: authHeader,
      payload: { to: "+33772158257", name: "LES AMIS" },
      env,
      fetchImpl,
      sleep: async () => {},
      attempts: 2,
      delayMs: 0,
    });

    const posts = calls.filter((call) => call.method === "POST");
    assert.equal(posts.length, 1);
    const params = new URLSearchParams(posts[0].body);
    assert.equal(params.has("Body"), false);
    assert.equal(params.get("ContentSid"), CEREMONY_J1_FR_CONTENT_SID);
    assert.equal(params.get("From"), "whatsapp:+15559811432");
    assert.equal(params.get("To"), "whatsapp:+33772158257");
    const variables = JSON.parse(params.get("ContentVariables") ?? "{}") as Record<string, string>;
    assert.deepEqual(variables, ceremonyJ1Variables("LES AMIS", "fr"));

    assert.equal(result.status, 502);
    assert.equal(result.body.ok, false);
    assert.equal(result.body.channel, "template");
    assert.equal(result.body.sid, SID);
    assert.equal(result.body.code, 63112);
    assert.equal(result.body.to, "whatsapp:+***8257");

    const failure = logs.find((entry) => entry[0] === "[whatsapp] echec envoi Twilio");
    assert.ok(failure);
    const detail = failure[1] as { code: number; sid: string; to: string; message: string };
    assert.equal(detail.code, 63112);
    assert.equal(detail.sid, SID);
    assert.equal(detail.to, "whatsapp:+***8257");
    assert.doesNotMatch(detail.message, /\+33772158257/);
    assert.equal(JSON.stringify(logs).includes("+33772158257"), false);
  });

  it("ne retente pas en texte libre quand Twilio refuse tout de suite", async () => {
    spyErrors();
    const { calls, fetchImpl } = captureFetch(() =>
      Response.json(
        { code: 63016, message: "outside the allowed window", status: 400 },
        { status: 400 },
      ),
    );
    const result = await runCeremonyPreview({
      authorization: authHeader,
      payload: {},
      env,
      fetchImpl,
      sleep: async () => {},
    });
    assert.equal(calls.length, 1);
    const params = new URLSearchParams(calls[0].body);
    assert.equal(params.has("Body"), false);
    assert.equal(params.get("ContentSid"), CEREMONY_J1_FR_CONTENT_SID);
    assert.equal(result.body.code, 63016);
    assert.equal(result.body.variables && (result.body.variables as Record<string, string>)["1"], "LES AMIS");
    const detail = logs[0][1] as { code: number; sid: null; to: string };
    assert.equal(detail.code, 63016);
    assert.equal(detail.sid, null);
    assert.equal(detail.to, "whatsapp:+***8257");
  });

  it("dryRun n'appelle pas Twilio", async () => {
    let called = false;
    const fetchImpl: typeof fetch = async () => {
      called = true;
      return Response.json({});
    };
    const result = await runCeremonyPreview({
      authorization: authHeader,
      payload: { dryRun: true },
      env: { ...env, TWILIO_WA_TEMPLATE_REMINDER_CEREMONY_J1_FR: "" },
      fetchImpl,
    });
    assert.equal(called, false);
    assert.equal(result.status, 200);
    assert.equal(result.body.contentSid, CEREMONY_J1_FR_CONTENT_SID);
    assert.equal(result.body.dryRun, true);
  });

  it("refuse un autre numéro et une requête sans secret", async () => {
    let called = false;
    const fetchImpl: typeof fetch = async () => {
      called = true;
      return Response.json({});
    };
    const other = await runCeremonyPreview({
      authorization: authHeader,
      payload: { to: "+33600000000" },
      env,
      fetchImpl,
    });
    const denied = await runCeremonyPreview({
      authorization: "Bearer nope",
      payload: { to: "+33772158257" },
      env,
      fetchImpl,
    });
    const unconfigured = await runCeremonyPreview({
      authorization: authHeader,
      payload: null,
      env: {},
      fetchImpl,
    });
    assert.equal(other.status, 400);
    assert.equal(denied.status, 401);
    assert.equal(unconfigured.status, 503);
    assert.equal(called, false);
  });
});
