import { authorizeIdentityBooking, identityJsonError, readIdentityForm } from "@/lib/identity-access";
import { IdentityError } from "@/lib/identity-error";
import { assertIdentityFile } from "@/lib/identity-file";
import { readIdentityDocument } from "@/lib/identity-ocr";
import { takeIdentityRate } from "@/lib/identity-rate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { bookingId, token, bytes } = await readIdentityForm(req);
    const booking = await authorizeIdentityBooking(bookingId, token);
    if (!takeIdentityRate(`extract:${booking.id}`)) throw new IdentityError("rate");
    const mime = assertIdentityFile(bytes);
    const read = await readIdentityDocument(bytes, mime);
    return Response.json(read);
  } catch (e) {
    return identityJsonError(e);
  }
}
