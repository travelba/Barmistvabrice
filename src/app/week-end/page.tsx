import { VoyageInvitation } from "@/components/invitation/VoyageInvitation";

/**
 * `/week-end` — Voyage / week-end à Mykonos (français).
 * Réplique de week-end.html ; le drapeau mène à /weekend-hebrew et le lien
 * de nav « Téphilines » vers /tephilines.
 */
export default function WeekEnd() {
  return <VoyageInvitation locale="fr" flagHref="/weekend-hebrew" tephilinesHref="/tephilines" />;
}
