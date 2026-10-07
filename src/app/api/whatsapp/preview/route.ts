import { NextResponse } from "next/server";
import { isWhatsappConfigured } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Aperçu demandé : un seul numéro, un seul texte. */
const PREVIEW_TO = "whatsapp:+33772158257";
const LAST_SID = "SM9bccc4e6c7b369bb5b3b5523e33f80a6";
const TEMPLATE_NAME = "bm_shon_rappel_jeudi";

const PREVIEW_BODY = `LES AMIS, PETIT RAPPEL: 
BM SHON CE JEUDI😘😘😘

Jeudi 8 octobre Grande Synagogue de la Victoire 44 rue de la Victoire, 75009 Paris : 10h15 

Famille Bechet`;

const API_BASE = "https://api.twilio.com/2010-04-01";
const CONTENT_BASE = "https://content.twilio.com/v1";

type Auth = { sid: string; token: string; from: string };

function twilioAuth(): Auth | null {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const rawFrom = process.env.TWILIO_WHATSAPP_FROM?.trim();
  if (!sid || !token || !rawFrom) return null;
  return {
    sid,
    token,
    from: rawFrom.startsWith("whatsapp:") ? rawFrom : `whatsapp:${rawFrom}`,
  };
}

function basic(auth: Auth): string {
  return `Basic ${Buffer.from(`${auth.sid}:${auth.token}`).toString("base64")}`;
}

function authorize(req: Request): boolean {
  const secret = process.env.WHATSAPP_PREVIEW_SECRET?.trim();
  return Boolean(secret) && req.headers.get("authorization") === `Bearer ${secret}`;
}

async function twilioJson(auth: Auth, url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: basic(auth),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  return { ok: res.ok, http: res.status, data };
}

async function messageStatus(auth: Auth, sid: string) {
  const { ok, http, data } = await twilioJson(
    auth,
    `${API_BASE}/Accounts/${auth.sid}/Messages/${sid}.json`,
  );
  return {
    ok,
    http,
    sid,
    status: typeof data?.status === "string" ? data.status : null,
    errorCode: typeof data?.error_code === "number" ? data.error_code : data?.error_code ?? null,
    errorMessage: typeof data?.error_message === "string" ? data.error_message.slice(0, 400) : null,
    from: typeof data?.from === "string" ? data.from : null,
    to: typeof data?.to === "string" ? data.to : null,
  };
}

async function findTemplate(auth: Auth): Promise<{ contentSid: string | null; approval: string | null; rejection: string | null }> {
  const listed = await twilioJson(auth, `${CONTENT_BASE}/Content?PageSize=100`);
  const contents = Array.isArray(listed.data?.contents) ? listed.data.contents : [];
  const match = contents.find((item) => {
    if (!item || typeof item !== "object") return false;
    const row = item as { friendly_name?: string; sid?: string };
    return row.friendly_name === TEMPLATE_NAME && typeof row.sid === "string";
  }) as { sid?: string } | undefined;

  let contentSid = match?.sid ?? null;
  if (!contentSid) {
    const created = await twilioJson(auth, `${CONTENT_BASE}/Content`, {
      method: "POST",
      body: JSON.stringify({
        friendly_name: TEMPLATE_NAME,
        language: "fr",
        types: { "twilio/text": { body: PREVIEW_BODY } },
      }),
    });
    contentSid = typeof created.data?.sid === "string" ? created.data.sid : null;
    if (!contentSid) {
      return {
        contentSid: null,
        approval: "create_failed",
        rejection: JSON.stringify(created.data)?.slice(0, 400) ?? null,
      };
    }
  }

  const approvalRes = await twilioJson(
    auth,
    `${CONTENT_BASE}/Content/${contentSid}/ApprovalRequests`,
  );
  const whatsapp = approvalRes.data?.whatsapp as { status?: string; rejection_reason?: string } | undefined;
  let approval = whatsapp?.status ?? null;
  let rejection = whatsapp?.rejection_reason ?? null;

  if (!approval || approval === "unsubmitted") {
    const submitted = await twilioJson(
      auth,
      `${CONTENT_BASE}/Content/${contentSid}/ApprovalRequests/whatsapp`,
      {
        method: "POST",
        body: JSON.stringify({ name: TEMPLATE_NAME, category: "UTILITY" }),
      },
    );
    const submittedWa = submitted.data?.whatsapp as { status?: string; rejection_reason?: string } | undefined;
    const status = submitted.data?.status;
    approval =
      submittedWa?.status ??
      (typeof status === "string" ? status : null) ??
      (submitted.ok ? "received" : "submit_failed");
    rejection =
      submittedWa?.rejection_reason ??
      (submitted.ok ? null : JSON.stringify(submitted.data)?.slice(0, 400) ?? null);
  }

  return { contentSid, approval, rejection };
}

async function sendFreeform(auth: Auth) {
  const form = new URLSearchParams();
  form.set("To", PREVIEW_TO);
  form.set("From", auth.from);
  form.set("Body", PREVIEW_BODY);
  const res = await fetch(`${API_BASE}/Accounts/${auth.sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: basic(auth),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
  const data = (await res.json().catch(() => null)) as {
    sid?: string;
    code?: number;
    message?: string;
    status?: string;
  } | null;
  return {
    ok: res.ok,
    http: res.status,
    sid: data?.sid ?? null,
    code: data?.code ?? null,
    message: data?.message?.slice(0, 300) ?? null,
    delivery: data?.status ?? null,
  };
}

async function waitForOutcome(auth: Auth, sid: string) {
  let last = await messageStatus(auth, sid);
  for (let i = 0; i < 6; i++) {
    if (last.status === "delivered" || last.status === "read" || last.status === "failed" || last.status === "undelivered") {
      return last;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
    last = await messageStatus(auth, sid);
  }
  return last;
}

async function sendTemplate(auth: Auth, contentSid: string) {
  const form = new URLSearchParams();
  form.set("To", PREVIEW_TO);
  form.set("From", auth.from);
  form.set("ContentSid", contentSid);
  const res = await fetch(`${API_BASE}/Accounts/${auth.sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: basic(auth),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });
  const data = (await res.json().catch(() => null)) as {
    sid?: string;
    code?: number;
    message?: string;
    status?: string;
  } | null;
  return {
    ok: res.ok,
    http: res.status,
    sid: data?.sid ?? null,
    code: data?.code ?? null,
    message: data?.message?.slice(0, 300) ?? null,
    delivery: data?.status ?? null,
  };
}

export async function GET(req: Request) {
  if (!process.env.WHATSAPP_PREVIEW_SECRET?.trim()) {
    return NextResponse.json({ error: "Aperçu non configuré" }, { status: 503 });
  }
  if (!authorize(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const auth = twilioAuth();
  if (!auth || !isWhatsappConfigured()) {
    return NextResponse.json({ error: "Twilio non configuré" }, { status: 503 });
  }
  const previous = await messageStatus(auth, LAST_SID);
  return NextResponse.json({ previous });
}

/**
 * Renvoie l'aperçu au 07 72 15 82 57 et attend le statut Twilio.
 * Si WhatsApp refuse le texte libre (fenêtre de 24 h), on tente le modèle approuvé.
 */
export async function POST(req: Request) {
  if (!process.env.WHATSAPP_PREVIEW_SECRET?.trim()) {
    return NextResponse.json({ error: "Aperçu non configuré" }, { status: 503 });
  }
  if (!authorize(req)) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const auth = twilioAuth();
  if (!auth || !isWhatsappConfigured()) {
    return NextResponse.json({ error: "Twilio non configuré" }, { status: 503 });
  }

  const sent = await sendFreeform(auth);
  if (!sent.ok || !sent.sid) {
    return NextResponse.json({ ...sent, to: "+33772158257", channel: "freeform" });
  }

  const outcome = await waitForOutcome(auth, sent.sid);
  const code = Number(outcome.errorCode);
  if (code !== 63016) {
    const arrived = outcome.status === "delivered" || outcome.status === "read" || outcome.status === "sent";
    return NextResponse.json({
      ...outcome,
      ok: arrived,
      to: "+33772158257",
      channel: "freeform",
    });
  }

  const template = await findTemplate(auth);
  if (template.approval !== "approved" || !template.contentSid) {
    return NextResponse.json({
      ok: false,
      to: "+33772158257",
      channel: "template",
      outcome,
      template,
      reason: "WhatsApp refuse le texte libre. Le modèle n'est pas encore approuvé.",
    });
  }

  const templated = await sendTemplate(auth, template.contentSid);
  const templatedOutcome = templated.sid ? await waitForOutcome(auth, templated.sid) : null;
  return NextResponse.json({
    ok: templatedOutcome?.status === "delivered" || templatedOutcome?.status === "read" || templatedOutcome?.status === "sent",
    to: "+33772158257",
    channel: "template",
    sent: templated,
    outcome: templatedOutcome,
    template,
  });
}
