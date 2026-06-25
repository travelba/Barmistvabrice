import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { listBookings } from "@/lib/data";
import { formatEuro } from "@/lib/pricing";

export const dynamic = "force-dynamic";

function csvCell(v: string): string {
  const s = String(v ?? "");
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const bookings = await listBookings();

  const header = [
    "Date",
    "Référence",
    "Statut",
    "Groupe",
    "Email",
    "Téléphone",
    "Hôtel",
    "Chambres",
    "Passagers",
    "Détail passagers",
    "Total chambres",
    "Total vols",
    "Total",
    "Cérémonie",
    "Invités cérémonie",
  ];

  const rows = bookings.map((b) =>
    [
      new Date(b.createdAt).toLocaleString("fr-FR"),
      b.id,
      b.status,
      b.groupName,
      b.email,
      b.phone,
      b.hotelName,
      b.rooms.map((r) => `${r.quantity}x ${r.roomName}`).join(" | "),
      String(b.passengerCount),
      b.passengers.map((p) => `${p.firstName} ${p.lastName} (${p.dateOfBirth})`).join(" | "),
      formatEuro(b.roomsTotalCents),
      formatEuro(b.flightTotalCents),
      formatEuro(b.totalCents),
      b.ceremonyAttending ? "Oui" : "Non",
      String(b.ceremonyGuestCount),
    ]
      .map(csvCell)
      .join(";"),
  );

  const csv = "\uFEFF" + [header.join(";"), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inscriptions-shon-bechet.csv"`,
    },
  });
}
