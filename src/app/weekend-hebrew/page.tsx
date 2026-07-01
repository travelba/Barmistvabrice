import { VoyageInvitation } from "@/components/invitation/VoyageInvitation";

/**
 * `/weekend-hebrew` — Voyage / week-end à Mykonos (hébreu).
 * Réplique de week-end-hebrew.html ; le drapeau ramène à /week-end et le lien
 * de nav « תפילין » vers /tephilines-hebrew.
 */
export default function WeekEndHebrew() {
  return (
    <VoyageInvitation locale="he" flagHref="/week-end" tephilinesHref="/tephilines-hebrew" />
  );
}
