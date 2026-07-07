import { TephilinesInvitation } from "@/components/invitation/TephilinesInvitation";

/**
 * `/carte` — alias propre de `/` (téphilines seul, français).
 * URL vierge de secours pour le partage WhatsApp (voir /invitation).
 */
export default function CarteAlias() {
  return <TephilinesInvitation locale="fr" showWeekend={false} flagHref="/teph-he" />;
}
