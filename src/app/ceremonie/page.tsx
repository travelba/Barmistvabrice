import { redirect } from "next/navigation";

/** Ancienne URL : redirige vers la page téphilines définitive. */
export default function CeremonieRedirect() {
  redirect("/tephilines");
}
