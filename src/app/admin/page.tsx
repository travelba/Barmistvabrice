import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/admin-auth";
import { getHotels, listBookings, listCeremonyRsvps } from "@/lib/data";
import { formatEuro } from "@/lib/pricing";
import { isSupabaseConfigured } from "@/lib/config";
import { adminT, adminDateLocale, resolveAdminLang } from "@/lib/admin-i18n";
import { AdminLogout } from "@/components/admin/AdminLogout";
import { BookingActions } from "@/components/admin/BookingActions";
import { RsvpActions } from "@/components/admin/RsvpActions";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  if (!(await isAdminAuthed())) redirect("/admin/login");

  const lang = resolveAdminLang((await searchParams).lang);
  const t = adminT(lang);
  const dateLocale = adminDateLocale(lang);
  const otherLangHref = lang === "he" ? "/admin" : "/admin?lang=he";

  const [hotels, bookings, rsvps] = await Promise.all([
    getHotels(),
    listBookings(),
    listCeremonyRsvps(),
  ]);
  const paid = bookings.filter((b) => b.status === "paid");
  const revenue = paid.reduce((acc, b) => acc + b.totalCents, 0);
  const passengers = paid.reduce((acc, b) => acc + b.passengerCount, 0);
  // Presence cumulee a la ceremonie : RSVP "ceremonie seule" + voyageurs presents.
  const ceremonyFromRsvp = rsvps
    .filter((r) => r.attending)
    .reduce((acc, r) => acc + r.guestCount, 0);
  const ceremonyFromTrip = paid
    .filter((b) => b.ceremonyAttending)
    .reduce((acc, b) => acc + b.passengerCount + b.ceremonyGuestCount, 0);
  const ceremonyTotal = ceremonyFromRsvp + ceremonyFromTrip;

  const statusLabel: Record<string, string> = {
    paid: t("status.paid"),
    pending: t("status.pending"),
    cancelled: t("status.cancelled"),
    expired: t("status.expired"),
  };

  return (
    <main className="min-h-screen bg-cream" dir={lang === "he" ? "rtl" : "ltr"}>
      <header className="border-b border-navy/10 bg-navy text-cream">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <div>
            <p className="kicker text-gold-light">{t("header.kicker")}</p>
            <h1 className="font-serif text-2xl">Bar Mitsvah Shon Bechet</h1>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={otherLangHref}
              className="rounded-full border border-cream/30 px-3 py-2 text-sm text-cream transition hover:bg-cream/10"
            >
              {t("header.lang")}
            </a>
            <a href="/api/admin/export" className="btn-gold rounded-full px-4 py-2 text-sm">
              {t("header.export")}
            </a>
            <AdminLogout lang={lang} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-10 px-5 py-10">
        {!isSupabaseConfigured && (
          <p className="rounded-lg bg-gold/15 px-4 py-3 text-sm text-navy">{t("demo.notice")}</p>
        )}

        {/* KPIs */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label={t("kpi.paid")} value={String(paid.length)} />
          <Kpi label={t("kpi.passengers")} value={String(passengers)} />
          <Kpi label={t("kpi.ceremony")} value={String(ceremonyTotal)} />
          <Kpi label={t("kpi.revenue")} value={formatEuro(revenue)} />
        </div>

        {/* Disponibilites */}
        <section>
          <h2 className="font-serif text-2xl text-navy">{t("stock.title")}</h2>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            {hotels.map((h) => (
              <div key={h.id} className="card rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-xl text-navy">{h.name}</h3>
                  <span className="rounded-full bg-navy px-3 py-1 text-xs text-cream">
                    {h.remaining} {t("stock.remaining")}
                  </span>
                </div>
                <table className="mt-4 w-full text-sm">
                  <thead>
                    <tr className="text-start text-muted">
                      <th className="pb-2 text-start font-medium">{t("stock.room")}</th>
                      <th className="pb-2 text-center font-medium">{t("stock.capacity")}</th>
                      <th className="pb-2 text-center font-medium">{t("stock.stock")}</th>
                      <th className="pb-2 text-center font-medium">{t("stock.booked")}</th>
                      <th className="pb-2 text-center font-medium">{t("stock.available")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {h.roomTypes.map((rt) => (
                      <tr key={rt.id} className="border-t border-navy/5">
                        <td className="py-2 text-navy">{rt.name}</td>
                        <td className="py-2 text-center text-muted">{rt.capacity}</td>
                        <td className="py-2 text-center text-muted">{rt.stockTotal}</td>
                        <td className="py-2 text-center text-muted">{rt.booked + rt.held}</td>
                        <td className="py-2 text-center font-semibold text-navy">{rt.available}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </section>

        {/* Inscriptions */}
        <section>
          <h2 className="font-serif text-2xl text-navy">
            {t("bookings.title")} ({bookings.length})
          </h2>
          <div className="mt-4 overflow-x-auto card rounded-2xl">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="bg-navy/5 text-muted">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">{t("bookings.date")}</th>
                  <th className="px-4 py-3 text-start font-medium">{t("bookings.group")}</th>
                  <th className="px-4 py-3 text-start font-medium">{t("bookings.contact")}</th>
                  <th className="px-4 py-3 text-start font-medium">{t("bookings.hotel")}</th>
                  <th className="px-4 py-3 text-start font-medium">{t("bookings.rooms")}</th>
                  <th className="px-4 py-3 text-center font-medium">{t("bookings.pax")}</th>
                  <th className="px-4 py-3 text-end font-medium">{t("bookings.total")}</th>
                  <th className="px-4 py-3 text-center font-medium">{t("bookings.status")}</th>
                  <th className="px-4 py-3 text-end font-medium">{t("bookings.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted">
                      {t("bookings.empty")}
                    </td>
                  </tr>
                ) : (
                  bookings.map((b) => (
                    <tr key={b.id} className="border-t border-navy/5">
                      <td className="px-4 py-3 text-muted">
                        {new Date(b.createdAt).toLocaleDateString(dateLocale)}
                      </td>
                      <td className="px-4 py-3 font-medium text-navy">{b.groupName}</td>
                      <td className="px-4 py-3 text-muted">
                        {b.email}
                        <br />
                        {b.phone}
                      </td>
                      <td className="px-4 py-3 text-muted">{b.hotelName}</td>
                      <td className="px-4 py-3 text-muted">
                        {b.rooms.length > 0 ? (
                          <ul className="space-y-0.5">
                            {b.rooms.map((r) => (
                              <li key={r.roomTypeId}>
                                {r.quantity}× {r.roomName}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-muted">{b.passengerCount}</td>
                      <td className="px-4 py-3 text-end font-medium text-navy">
                        {formatEuro(b.totalCents)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs ${
                            b.status === "paid"
                              ? "bg-green-100 text-green-700"
                              : b.status === "pending"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {statusLabel[b.status] ?? b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-end">
                        <BookingActions bookingId={b.id} status={b.status} lang={lang} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* RSVP mise des Tephilines (lien ceremonie seul) */}
        <section>
          <h2 className="font-serif text-2xl text-navy">
            {t("rsvp.title")} ({rsvps.length})
          </h2>
          <p className="mt-1 text-sm text-muted">{t("rsvp.subtitle")}</p>
          <div className="mt-4 overflow-x-auto card rounded-2xl">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-navy/5 text-muted">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">{t("bookings.date")}</th>
                  <th className="px-4 py-3 text-start font-medium">{t("rsvp.name")}</th>
                  <th className="px-4 py-3 text-start font-medium">{t("bookings.contact")}</th>
                  <th className="px-4 py-3 text-center font-medium">{t("rsvp.answer")}</th>
                  <th className="px-4 py-3 text-center font-medium">{t("rsvp.guests")}</th>
                  <th className="px-4 py-3 text-end font-medium">{t("bookings.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {rsvps.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted">
                      {t("rsvp.empty")}
                    </td>
                  </tr>
                ) : (
                  rsvps.map((r) => (
                    <tr key={r.id} className="border-t border-navy/5">
                      <td className="px-4 py-3 text-muted">
                        {new Date(r.createdAt).toLocaleDateString(dateLocale)}
                      </td>
                      <td className="px-4 py-3 font-medium text-navy">{r.name}</td>
                      <td className="px-4 py-3 text-muted">
                        {r.email}
                        <br />
                        {r.phone}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs ${
                            r.attending ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {r.attending ? t("rsvp.present") : t("rsvp.absent")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-muted">
                        {r.attending ? r.guestCount : "—"}
                      </td>
                      <td className="px-4 py-3 text-end">
                        <RsvpActions rsvpId={r.id} lang={lang} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="card rounded-2xl p-6">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 font-serif text-3xl text-navy">{value}</p>
    </div>
  );
}
