import { TephilinesInvitation } from "@/components/invitation/TephilinesInvitation";

/**
 * `/invitation-weekend` — alias propre de `/tephilines` (téphilines + week-end).
 * URL vierge destinée au partage WhatsApp (voir /invitation).
 */
export default function InvitationWeekendAlias() {
  return (
    <TephilinesInvitation
      locale="fr"
      showWeekend
      flagHref="/tephilines-hebrew"
      weekendHref="/week-end"
    />
  );
}
