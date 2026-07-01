import { TephilinesInvitation } from "@/components/invitation/TephilinesInvitation";

/**
 * `/` — Téphilines seulement (français), sans lien week-end.
 * Réplique de index.html du site d'origine ; le drapeau mène à /teph-he.
 */
export default function Home() {
  return <TephilinesInvitation locale="fr" showWeekend={false} flagHref="/teph-he" />;
}
