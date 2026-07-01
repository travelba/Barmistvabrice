import { TephilinesInvitation } from "@/components/invitation/TephilinesInvitation";

/**
 * `/tephilines` — Téphilines + week-end (français).
 * Réplique de tephilines.html : lien de nav « Week-end » vers /week-end,
 * drapeau vers la version hébraïque /tephilines-hebrew.
 */
export default function Tephilines() {
  return (
    <TephilinesInvitation
      locale="fr"
      showWeekend
      flagHref="/tephilines-hebrew"
      weekendHref="/week-end"
    />
  );
}
