import { isAgenceAuthed } from "@/lib/agence-auth";
import { identityJsonError, readIdentityForm } from "@/lib/identity-access";
import { IdentityError } from "@/lib/identity-error";
import { assertIdentityFile } from "@/lib/identity-file";
import { readIdentityDocument } from "@/lib/identity-ocr";
import { takeIdentityRate } from "@/lib/identity-rate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    if (!(await isAgenceAuthed())) throw new IdentityError("unauthorized");
    const { bytes } = await readIdentityForm(req);
    if (!takeIdentityRate("extract:agence")) throw new IdentityError("rate");
    const mime = assertIdentityFile(bytes);
    const read = await readIdentityDocument(bytes, mime);
    return Response.json(read);
  } catch (e) {
    return identityJsonError(e);
  }
}
