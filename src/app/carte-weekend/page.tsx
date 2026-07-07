import { TephilinesInvitation } from "@/components/invitation/TephilinesInvitation";

/**
 * `/carte-weekend` — alias propre de `/tephilines` (téphilines + week-end).
 * URL vierge destinée au partage WhatsApp (voir /carte).
 */
export default function CarteWeekendAlias() {
  return (
    <TephilinesInvitation
      locale="fr"
      showWeekend
      flagHref="/tephilines-hebrew"
      weekendHref="/week-end"
    />
  );
}
