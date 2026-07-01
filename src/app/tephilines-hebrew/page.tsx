import { TephilinesInvitation } from "@/components/invitation/TephilinesInvitation";

/**
 * `/tephilines-hebrew` — Téphilines + week-end (hébreu).
 * Réplique de tephilines-hebrew.html : lien de nav « סוף שבוע » vers
 * /weekend-hebrew, drapeau vers la version française /tephilines.
 */
export default function TephilinesHebrew() {
  return (
    <TephilinesInvitation
      locale="he"
      showWeekend
      flagHref="/tephilines"
      weekendHref="/weekend-hebrew"
    />
  );
}
