import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { authorizeIdentityBooking, identityJsonError, readIdentityForm } from "@/lib/identity-access";
import { IdentityError } from "@/lib/identity-error";
import { assertIdentityFile } from "@/lib/identity-file";
import { takeIdentityRate } from "@/lib/identity-rate";
import {
  parseIdentityImport,
  removeIdentityFile,
  saveIdentityScan,
  setIdentitySheetRow,
} from "@/lib/identity-store";
import { isManifestSheetConfigured, upsertManifestPassenger } from "@/lib/sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { bookingId, token, bytes, form } = await readIdentityForm(req);
    const booking = await authorizeIdentityBooking(bookingId, token);
    if (!takeIdentityRate(`import:${booking.id}`)) throw new IdentityError("rate");
    if (!getSupabaseAdmin()) throw new IdentityError("storage");
    if (!isManifestSheetConfigured()) throw new IdentityError("sheet");

    const mime = assertIdentityFile(bytes);
    let payload: unknown;
    try {
      payload = JSON.parse(String(form.get("payload") ?? ""));
    } catch {
      throw new IdentityError("invalid");
    }
    const parsed = parseIdentityImport(payload);
    const passengerIndex =
      parsed.passengerIndex != null && parsed.passengerIndex < booking.passengers.length
        ? parsed.passengerIndex
        : null;

    const saved = await saveIdentityScan({
      bookingId: booking.id,
      passengerIndex,
      mime,
      bytes,
      passenger: parsed.passenger,
    });

    let sheetRow: number;
    try {
      sheetRow = await upsertManifestPassenger(parsed.passenger);
    } catch (e) {
      console.error("[identity/import] sheet", e instanceof Error ? e.name : "error");
      throw new IdentityError("sheet");
    }

    await setIdentitySheetRow(saved.document.id, sheetRow);
    if (saved.previousPath) await removeIdentityFile(saved.previousPath);

    return Response.json({ document: saved.document });
  } catch (e) {
    return identityJsonError(e);
  }
}
