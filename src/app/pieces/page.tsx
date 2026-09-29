import { dictionaries } from "@/i18n/dictionaries";
import { authorizeIdentityBooking } from "@/lib/identity-access";
import { IdentityError } from "@/lib/identity-error";
import { buildIdentitySlots } from "@/lib/identity-slots";
import { listIdentityDocuments } from "@/lib/identity-store";
import type { Locale } from "@/lib/types";
import { IdentityForm } from "./IdentityForm";

export const dynamic = "force-dynamic";

export default async function PiecesPage({
  searchParams,
}: {
  searchParams: Promise<{ booking_id?: string; token?: string; lang?: string }>;
}) {
  const params = await searchParams;
  const lang: Locale = params.lang === "he" ? "he" : "fr";
  const t = (key: string) => dictionaries[lang][key] ?? dictionaries.fr[key] ?? key;

  const loaded = await loadPieces(params.booking_id ?? "", params.token ?? null);
  if (!loaded.ok) {
    const key = loaded.code === "not_eligible" ? "id.error.not_eligible" : "id.invalidLink";
    return (
      <main
        className="theme-taupe flex min-h-screen items-center justify-center bg-[var(--paper-base)] px-5 text-center text-[var(--text)]"
        dir={lang === "he" ? "rtl" : "ltr"}
      >
        <div className="max-w-md">
          <h1 className="font-serif text-3xl">{t("id.title")}</h1>
          <p className="mt-4 text-sm">{t(key)}</p>
        </div>
      </main>
    );
  }

  return (
    <IdentityForm
      bookingId={loaded.bookingId}
      token={params.token ?? ""}
      groupName={loaded.groupName}
      initialSlots={loaded.slots}
    />
  );
}

async function loadPieces(bookingId: string, token: string | null) {
  try {
    const booking = await authorizeIdentityBooking(bookingId, token);
    const docs = await listIdentityDocuments(booking.id);
    return {
      ok: true as const,
      bookingId: booking.id,
      groupName: booking.groupName,
      slots: buildIdentitySlots(booking.passengers, docs),
    };
  } catch (e) {
    return {
      ok: false as const,
      code: e instanceof IdentityError ? e.code : "unauthorized",
    };
  }
}
