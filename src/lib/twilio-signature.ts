import { createHmac, timingSafeEqual } from "node:crypto";

/** Signature Twilio : HMAC-SHA1 de l'URL publique puis des champs triés. */
export function twilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
): string {
  const payload = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);
  return createHmac("sha1", authToken).update(payload, "utf8").digest("base64");
}

export function verifyTwilioSignature(
  authToken: string,
  signature: string | null,
  url: string,
  params: Record<string, string>,
): boolean {
  if (!authToken || !signature) return false;
  const expected = twilioSignature(authToken, url, params);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** URL vue par Twilio, derrière le proxy Vercel. */
export function publicRequestUrl(req: Request): string {
  const url = new URL(req.url);
  const proto = (req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", ""))
    .split(",")[0]
    .trim();
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host)
    .split(",")[0]
    .trim();
  return `${proto}://${host}${url.pathname}${url.search}`;
}
