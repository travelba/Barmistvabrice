import { isAgenceAuthed } from "@/lib/agence-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { identityJsonError, readIdentityForm } from "@/lib/identity-access";
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
    if (!(await isAgenceAuthed())) throw new IdentityError("unauthorized");
    const { bytes, form } = await readIdentityForm(req);
    if (!takeIdentityRate("import:agence")) throw new IdentityError("rate");
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

    const saved = await saveIdentityScan({
      bookingId: null,
      passengerIndex: null,
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
