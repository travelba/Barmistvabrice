import { verifyIdentityToken } from "./doc-token";
import { getBookingById } from "./data";
import { IdentityError, identityErrorStatus } from "./identity-error";
import { NextResponse } from "next/server";
import type { Booking } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function authorizeIdentityBooking(
  bookingId: string,
  token: string | null,
): Promise<Booking> {
  if (!UUID.test(bookingId) || !verifyIdentityToken(bookingId, token)) {
    throw new IdentityError("unauthorized");
  }
  const booking = await getBookingById(bookingId);
  if (!booking) throw new IdentityError("unauthorized");
  if (booking.status !== "paid" || booking.flightTotalCents <= 0) {
    throw new IdentityError("not_eligible");
  }
  return booking;
}

export async function readIdentityForm(req: Request): Promise<{
  bookingId: string;
  token: string;
  bytes: Uint8Array;
  form: FormData;
}> {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new IdentityError("invalid");
  }
  const bookingId = String(form.get("bookingId") ?? "");
  const token = String(form.get("token") ?? "");
  const file = form.get("file");
  if (!(file instanceof File)) throw new IdentityError("file_type");
  const bytes = new Uint8Array(await file.arrayBuffer());
  return { bookingId, token, bytes, form };
}

export function identityJsonError(e: unknown): NextResponse {
  if (e instanceof IdentityError) {
    console.error("[identity]", e.code);
    return NextResponse.json({ error: e.code }, { status: identityErrorStatus(e.code) });
  }
  console.error("[identity] unexpected", e instanceof Error ? e.name : "error");
  return NextResponse.json({ error: "generic" }, { status: 500 });
}
