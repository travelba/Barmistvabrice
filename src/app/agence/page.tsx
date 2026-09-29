import { isAgenceAuthed } from "@/lib/agence-auth";
import { AgenceDesk } from "./AgenceDesk";
import { AgenceGate } from "./AgenceGate";

export const dynamic = "force-dynamic";

export default async function AgencePage() {
  if (!(await isAgenceAuthed())) return <AgenceGate />;
  return <AgenceDesk />;
}
