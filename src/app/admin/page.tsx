import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/admin-auth";
import { getHotels, listBookings, listCeremonyRsvps } from "@/lib/data";
import { formatEuro } from "@/lib/pricing";
import { isSupabaseConfigured } from "@/lib/config";
import { AdminLogout } from "@/components/admin/AdminLogout";
import { BookingActions } from "@/components/admin/BookingActions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  paid: "Payé",
  pending: "En attente",
  cancelled: "Annulé",
  expired: "Expiré",
};

export default async function AdminPage() {
  if (!(await isAdminAuthed())) redirect("/admin/login");

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

  return (
    <main className="min-h-screen bg-cream">
      <header className="border-b border-navy/10 bg-navy text-cream">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <div>
            <p className="kicker text-gold-light">Espace agence</p>
            <h1 className="font-serif text-2xl">Bar Mitsvah Shon Bechet</h1>
          </div>
          <div className="flex items-center gap-3">
            <a href="/api/admin/export" className="btn-gold rounded-full px-4 py-2 text-sm">
              Export CSV
            </a>
            <AdminLogout />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-10 px-5 py-10">
        {!isSupabaseConfigured && (
          <p className="rounded-lg bg-gold/15 px-4 py-3 text-sm text-navy">
            Mode démonstration (Supabase non configuré) — les données ne sont pas persistées entre les
            redémarrages du serveur.
          </p>
        )}

        {/* KPIs */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Réservations payées" value={String(paid.length)} />
          <Kpi label="Passagers (vols)" value={String(passengers)} />
          <Kpi label="Présents cérémonie" value={String(ceremonyTotal)} />
          <Kpi label="Chiffre d'affaires" value={formatEuro(revenue)} />
        </div>

        {/* Disponibilites */}
        <section>
          <h2 className="font-serif text-2xl text-navy">Places restantes</h2>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            {hotels.map((h) => (
              <div key={h.id} className="card rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-xl text-navy">{h.name}</h3>
                  <span className="rounded-full bg-navy px-3 py-1 text-xs text-cream">
                    {h.remaining} restantes
                  </span>
                </div>
                <table className="mt-4 w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted">
                      <th className="pb-2 font-medium">Chambre</th>
                      <th className="pb-2 text-center font-medium">Cap.</th>
                      <th className="pb-2 text-center font-medium">Stock</th>
                      <th className="pb-2 text-center font-medium">Réservées</th>
                      <th className="pb-2 text-center font-medium">Dispo</th>
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
          <h2 className="font-serif text-2xl text-navy">Inscriptions ({bookings.length})</h2>
          <div className="mt-4 overflow-x-auto card rounded-2xl">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-navy/5 text-left text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Groupe</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Hôtel</th>
                  <th className="px-4 py-3 text-center font-medium">Pax</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 text-center font-medium">Statut</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted">
                      Aucune inscription pour le moment.
                    </td>
                  </tr>
                ) : (
                  bookings.map((b) => (
                    <tr key={b.id} className="border-t border-navy/5">
                      <td className="px-4 py-3 text-muted">
                        {new Date(b.createdAt).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-4 py-3 font-medium text-navy">{b.groupName}</td>
                      <td className="px-4 py-3 text-muted">
                        {b.email}
                        <br />
                        {b.phone}
                      </td>
                      <td className="px-4 py-3 text-muted">{b.hotelName}</td>
                      <td className="px-4 py-3 text-center text-muted">{b.passengerCount}</td>
                      <td className="px-4 py-3 text-right font-medium text-navy">
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
                          {STATUS_LABEL[b.status] ?? b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <BookingActions bookingId={b.id} status={b.status} />
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
            Mise des Téphilines — RSVP ({rsvps.length})
          </h2>
          <p className="mt-1 text-sm text-muted">
            Réponses reçues via le lien cérémonie (hors voyageurs, comptés dans les inscriptions).
          </p>
          <div className="mt-4 overflow-x-auto card rounded-2xl">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-navy/5 text-left text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Nom</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 text-center font-medium">Réponse</th>
                  <th className="px-4 py-3 text-center font-medium">Personnes</th>
                </tr>
              </thead>
              <tbody>
                {rsvps.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted">
                      Aucune réponse pour le moment.
                    </td>
                  </tr>
                ) : (
                  rsvps.map((r) => (
                    <tr key={r.id} className="border-t border-navy/5">
                      <td className="px-4 py-3 text-muted">
                        {new Date(r.createdAt).toLocaleDateString("fr-FR")}
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
                          {r.attending ? "Présent" : "Absent"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-muted">
                        {r.attending ? r.guestCount : "—"}
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
