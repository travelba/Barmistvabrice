import { isAdminAuthed } from "@/lib/admin-auth";
import { extensionForMime } from "@/lib/identity-file";
import { openIdentityFile } from "@/lib/identity-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminAuthed())) {
    return new Response("Non autorisé", { status: 401 });
  }
  const { id } = await ctx.params;
  const file = await openIdentityFile(id);
  if (!file) return new Response("Introuvable", { status: 404 });

  return new Response(Buffer.from(file.bytes), {
    headers: {
      "Content-Type": file.mime,
      "Content-Disposition": `inline; filename="piece-identite.${extensionForMime(file.mime)}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
