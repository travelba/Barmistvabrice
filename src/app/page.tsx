import { redirect } from "next/navigation";

/**
 * La racine n'expose rien : le client diffuse deux liens distincts
 *  - /ceremonie : invites a la mise des Tephilines uniquement
 *  - /voyage    : invites a la ceremonie ET au voyage a Mykonos
 * Par defaut on dirige vers l'experience complete.
 */
export default function RootPage() {
  redirect("/voyage");
}
