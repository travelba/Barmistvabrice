import { TephilinesInvitation } from "@/components/invitation/TephilinesInvitation";

/**
 * `/invitation` — alias propre de `/` (téphilines seul, français).
 * URL vierge destinée au partage WhatsApp : jamais partagée auparavant,
 * donc aucun aperçu erroné en cache chez les invités.
 */
export default function InvitationAlias() {
  return <TephilinesInvitation locale="fr" showWeekend={false} flagHref="/teph-he" />;
}
