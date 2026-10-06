import { NextResponse } from "next/server";
import { isWhatsappConfigured } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Aperçu demandé : un seul numéro, un seul texte. */
const PREVIEW_TO = "whatsapp:+33772158257";

const PREVIEW_BODY = `LES AMIS, PETIT RAPPEL: 
BM SHON CE JEUDI😘😘😘

Jeudi 8 octobre Grande Synagogue de la Victoire 44 rue de la Victoire, 75009 Paris : 10h15 

Famille Bechet`;

const API_BASE = "https://api.twilio.com/2010-04-01";

function twilioAuth(): { sid: string; token: string; from: string } | null {
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

function basic(sid: string, token: string): string {
  return `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`;
}

async function sendFreeform(auth: { sid: string; token: string; from: string }) {
  const form = new URLSearchParams();
  form.set("To", PREVIEW_TO);
  form.set("From", auth.from);
  form.set("Body", PREVIEW_BODY);
  const res = await fetch(`${API_BASE}/Accounts/${auth.sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: basic(auth.sid, auth.token),
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

/**
 * Envoie le rappel libre uniquement au 07 72 15 82 57.
 * Protégé par WHATSAPP_PREVIEW_SECRET. N'envoie à personne d'autre.
 */
export async function POST(req: Request) {
  const secret = process.env.WHATSAPP_PREVIEW_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "Aperçu non configuré" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (!isWhatsappConfigured()) {
    return NextResponse.json({ error: "Twilio non configuré" }, { status: 503 });
  }
  const auth = twilioAuth();
  if (!auth) {
    return NextResponse.json({ error: "Twilio non configuré" }, { status: 503 });
  }

  try {
    const sent = await sendFreeform(auth);
    if (!sent.ok) {
      console.error("[whatsapp] aperçu refusé", sent.http, sent.code);
    } else {
      console.log("[whatsapp] aperçu envoyé", sent.sid);
    }
    return NextResponse.json({ ...sent, to: "+33772158257" });
  } catch (e) {
    console.error("[whatsapp] aperçu", e instanceof Error ? e.name : "error");
    return NextResponse.json({ error: "Envoi impossible" }, { status: 502 });
  }
}
