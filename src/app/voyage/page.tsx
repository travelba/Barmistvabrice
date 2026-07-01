import { redirect } from "next/navigation";

/** Ancienne URL : redirige vers la page voyage définitive. */
export default function VoyageRedirect() {
  redirect("/week-end");
}
