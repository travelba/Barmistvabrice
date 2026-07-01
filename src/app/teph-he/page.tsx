import { TephilinesInvitation } from "@/components/invitation/TephilinesInvitation";

/**
 * `/teph-he` — Téphilines seulement (hébreu), sans lien week-end.
 * Réplique de teph-he.html ; le drapeau ramène à la version française /.
 */
export default function TephHe() {
  return <TephilinesInvitation locale="he" showWeekend={false} flagHref="/" />;
}
