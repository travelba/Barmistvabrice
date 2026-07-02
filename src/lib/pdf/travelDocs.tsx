import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import QRCode from "qrcode";
import { EVENT, FLIGHT, TRIP_NIGHTS } from "@/lib/config";
import { PDF_THEME } from "@/lib/event-theme";
import { formatEuro } from "@/lib/pricing";
import { getHotels } from "@/lib/data";
import type { Booking } from "@/lib/types";

const C = PDF_THEME;

const s = StyleSheet.create({
  page: { backgroundColor: C.cream, paddingTop: 0, paddingBottom: 40, fontFamily: "Helvetica" },
  band: { backgroundColor: C.navy, paddingVertical: 26, paddingHorizontal: 40, textAlign: "center" },
  kicker: { color: C.goldLight, fontSize: 8, letterSpacing: 3, textAlign: "center" },
  bandTitle: { color: C.cream, fontFamily: "Times-Roman", fontSize: 26, marginTop: 6, textAlign: "center" },
  bandSub: { color: C.onDarkMuted, fontSize: 10, marginTop: 4, textAlign: "center" },
  body: { paddingHorizontal: 40, paddingTop: 26 },
  sectionLabel: { color: C.gold, fontSize: 8, letterSpacing: 3, marginBottom: 10 },

  card: { backgroundColor: C.paper, borderRadius: 12, borderWidth: 1, borderColor: C.line, overflow: "hidden", marginBottom: 18 },

  // Voucher
  vTop: { backgroundColor: C.navy, padding: 18 },
  vHotel: { color: C.cream, fontFamily: "Times-Roman", fontSize: 18 },
  vMeta: { color: C.onDarkMuted, fontSize: 9, marginTop: 3 },
  vBody: { padding: 18 },
  statRow: { flexDirection: "row", marginBottom: 14 },
  stat: { width: "25%" },
  statLabel: { color: C.muted, fontSize: 7, letterSpacing: 1.5 },
  statValue: { color: C.ink, fontSize: 11, marginTop: 3 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 7 },
  rowText: { color: C.ink, fontSize: 10 },
  rowSub: { color: C.muted, fontSize: 7.5, marginTop: 2 },
  hr: { height: 1, backgroundColor: C.line, marginVertical: 12 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderTopWidth: 1, borderTopColor: C.line, paddingTop: 12, marginTop: 8 },
  totalLabel: { color: C.muted, fontSize: 7, letterSpacing: 1.5 },
  totalValue: { color: C.ink, fontFamily: "Times-Roman", fontSize: 18 },

  // Boarding pass
  pass: { flexDirection: "row", backgroundColor: C.paper, borderRadius: 12, borderWidth: 1, borderColor: C.line, overflow: "hidden", marginBottom: 14 },
  passMain: { flexGrow: 1, padding: 16 },
  passHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  airline: { color: C.ink, fontFamily: "Times-Roman", fontSize: 13 },
  airlineBy: { color: C.muted, fontSize: 6.5, letterSpacing: 1.5, marginTop: 2 },
  badge: { borderWidth: 0.5, borderColor: "#c7ccd0", color: C.muted, fontSize: 6.5, letterSpacing: 1.5, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 20 },
  legLabel: { color: C.gold, fontSize: 7, letterSpacing: 2, marginTop: 8, marginBottom: 4 },
  leg: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  legCode: { color: C.ink, fontFamily: "Times-Roman", fontSize: 22 },
  legCity: { color: C.muted, fontSize: 6.5, letterSpacing: 1, marginTop: 2 },
  legTime: { color: C.gold, fontFamily: "Times-Roman", fontSize: 12, marginTop: 2 },
  legMid: { alignItems: "center", flexGrow: 1, paddingHorizontal: 8 },
  legNo: { color: C.muted, fontSize: 7, letterSpacing: 1 },
  legDate: { color: C.muted, fontSize: 7, marginTop: 8 },
  legLine: { height: 1, backgroundColor: C.line, width: "70%", marginVertical: 4 },
  fieldRow: { flexDirection: "row", marginTop: 12 },
  field: { width: "25%" },
  fieldLabel: { color: C.muted, fontSize: 6.5, letterSpacing: 1 },
  fieldValue: { color: C.ink, fontSize: 10, marginTop: 2 },
  stub: { width: 132, backgroundColor: C.navy, padding: 14, justifyContent: "space-between" },
  stubKicker: { color: C.goldLight, fontSize: 7, letterSpacing: 1.5 },
  stubTitle: { color: C.cream, fontFamily: "Times-Roman", fontSize: 13, marginTop: 4 },
  stubDates: { color: C.onDarkMuted, fontSize: 7, marginTop: 6 },
  stubName: { color: C.cream, fontSize: 10, marginTop: 2 },
  qr: { width: 54, height: 54, marginTop: 8, backgroundColor: C.white, padding: 3, borderRadius: 4 },
  footer: { textAlign: "center", color: C.muted, fontSize: 8, marginTop: 8 },
});

function frDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

type FlightLeg = typeof FLIGHT.outbound | typeof FLIGHT.inbound;

function Leg({ leg, label }: { leg: FlightLeg; label: string }) {
  return (
    <View>
      <Text style={s.legLabel}>{label}</Text>
      <View style={s.leg}>
        <View>
          <Text style={s.legCode}>{leg.fromCode}</Text>
          <Text style={s.legCity}>{leg.fromCity.toUpperCase()}</Text>
          <Text style={s.legTime}>{leg.depTime}</Text>
        </View>
        <View style={s.legMid}>
          <Text style={s.legNo}>{leg.flightNo}</Text>
          <View style={s.legLine} />
          <Text style={s.legDate}>{leg.dateLabel}</Text>
        </View>
        <View>
          <Text style={[s.legCode, { textAlign: "right" }]}>{leg.toCode}</Text>
          <Text style={[s.legCity, { textAlign: "right" }]}>{leg.toCity.toUpperCase()}</Text>
          <Text style={[s.legTime, { textAlign: "right" }]}>{leg.arrTime}</Text>
        </View>
      </View>
    </View>
  );
}

function BoardingPassPdf({
  name,
  dob,
  bref,
  seq,
  qr,
}: {
  name: string;
  dob: string;
  bref: string;
  seq: number;
  qr?: string;
}) {
  return (
    <View style={s.pass} wrap={false}>
      <View style={s.passMain}>
        <View style={s.passHead}>
          <View>
            <Text style={s.airline}>{FLIGHT.airline}</Text>
            <Text style={s.airlineBy}>{FLIGHT.airlineBy.toUpperCase()}</Text>
          </View>
          <Text style={s.badge}>BOARDING PASS</Text>
        </View>
        <Leg leg={FLIGHT.outbound} label="ALLER" />
        <Leg leg={FLIGHT.inbound} label="RETOUR" />
        <View style={s.fieldRow}>
          <View style={s.field}>
            <Text style={s.fieldLabel}>PASSAGER</Text>
            <Text style={s.fieldValue}>{name}</Text>
          </View>
          <View style={s.field}>
            <Text style={s.fieldLabel}>NÉ(E) LE</Text>
            <Text style={s.fieldValue}>{dob || "—"}</Text>
          </View>
          <View style={s.field}>
            <Text style={s.fieldLabel}>EMBARQUEMENT</Text>
            <Text style={s.fieldValue}>{FLIGHT.outbound.boarding}</Text>
          </View>
          <View style={s.field}>
            <Text style={s.fieldLabel}>CABINE</Text>
            <Text style={s.fieldValue}>Privée</Text>
          </View>
        </View>
      </View>
      <View style={s.stub}>
        <View>
          <Text style={s.stubKicker}>{EVENT.destination.toUpperCase()}</Text>
          <Text style={s.stubTitle}>{EVENT.title}</Text>
          <Text style={s.stubDates}>09–11 OCT 2026</Text>
        </View>
        <View>
          {qr && <Image src={qr} style={s.qr} />}
          <Text style={[s.stubKicker, { marginTop: 8 }]}>PASSAGER</Text>
          <Text style={s.stubName}>{name}</Text>
          <Text style={[s.stubDates, { marginTop: 4 }]}>Billet {seq} · RÉF {bref}</Text>
        </View>
      </View>
    </View>
  );
}

interface HotelMeta {
  location?: string;
  stars?: number;
  photoDataUri?: string;
}

function TravelDocs({
  booking,
  hotel,
  codes,
}: {
  booking: Booking;
  hotel: HotelMeta;
  codes: string[];
}) {
  const ref = booking.id.slice(0, 8).toUpperCase();
  const flightUnitCents =
    booking.passengerCount > 0
      ? Math.round(booking.flightTotalCents / booking.passengerCount)
      : FLIGHT.pricePerPassengerCents;
  return (
    <Document
      title={`Carnet de voyage — ${booking.groupName}`}
      author={EVENT.agencyName}
    >
      <Page size="A4" style={s.page}>
        <View style={s.band}>
          <Text style={s.kicker}>BAR MITSVAH · {EVENT.childName.toUpperCase()}</Text>
          <Text style={s.bandTitle}>Carnet de voyage</Text>
          <Text style={s.bandSub}>{EVENT.destination} · 09–11 octobre 2026 · Réf {ref}</Text>
        </View>

        <View style={s.body}>
          <Text style={s.sectionLabel}>CONFIRMATION HÔTEL</Text>
          <View style={s.card}>
            <View style={s.vTop}>
              {hotel.photoDataUri && (
                <Image src={hotel.photoDataUri} style={{ height: 120, marginBottom: 10, borderRadius: 6 }} />
              )}
              <Text style={s.vHotel}>{booking.hotelName}</Text>
              <Text style={s.vMeta}>
                {[hotel.location, hotel.stars ? `${hotel.stars} étoiles` : null].filter(Boolean).join(" · ")}
              </Text>
            </View>
            <View style={s.vBody}>
              <View style={s.statRow}>
                <View style={s.stat}>
                  <Text style={s.statLabel}>ARRIVÉE</Text>
                  <Text style={s.statValue}>{frDate(EVENT.tripStartDate)}</Text>
                </View>
                <View style={s.stat}>
                  <Text style={s.statLabel}>DÉPART</Text>
                  <Text style={s.statValue}>{frDate(EVENT.tripEndDate)}</Text>
                </View>
                <View style={s.stat}>
                  <Text style={s.statLabel}>NUITS</Text>
                  <Text style={s.statValue}>2 nuits</Text>
                </View>
                <View style={s.stat}>
                  <Text style={s.statLabel}>VOYAGEURS</Text>
                  <Text style={s.statValue}>{booking.passengerCount} pers.</Text>
                </View>
              </View>
              {booking.rooms.map((r, i) => (
                <View style={s.row} key={i}>
                  <View>
                    <Text style={s.rowText}>
                      {r.quantity}× {r.roomName}
                    </Text>
                    <Text style={s.rowSub}>
                      {formatEuro(r.priceCents)} × {TRIP_NIGHTS} nuits
                    </Text>
                  </View>
                  <Text style={s.rowText}>{formatEuro(r.priceCents * r.quantity * TRIP_NIGHTS)}</Text>
                </View>
              ))}
              <View style={s.totalRow}>
                <View>
                  <Text style={s.totalLabel}>RÉSERVATION AU NOM DE</Text>
                  <Text style={s.statValue}>{booking.groupName}</Text>
                </View>
                <View>
                  <Text style={[s.totalLabel, { textAlign: "right" }]}>TOTAL HÉBERGEMENT</Text>
                  <Text style={s.totalValue}>{formatEuro(booking.roomsTotalCents)}</Text>
                </View>
              </View>
            </View>
          </View>

          <Text style={s.sectionLabel}>BILLETS D&apos;EMBARQUEMENT</Text>
          {booking.passengers.map((p, i) => (
            <BoardingPassPdf
              key={i}
              name={`${p.firstName} ${p.lastName}`.trim()}
              dob={p.dateOfBirth}
              bref={ref}
              seq={i + 1}
              qr={codes[i]}
            />
          ))}

          <Text style={s.sectionLabel}>RÉCAPITULATIF DU COÛT</Text>
          <View style={s.card} wrap={false}>
            <View style={s.vBody}>
              <View style={s.row}>
                <View>
                  <Text style={s.rowText}>Hébergement</Text>
                  <Text style={s.rowSub}>
                    {booking.hotelName} · {TRIP_NIGHTS} nuits
                  </Text>
                </View>
                <Text style={s.rowText}>{formatEuro(booking.roomsTotalCents)}</Text>
              </View>
              <View style={s.row}>
                <View>
                  <Text style={s.rowText}>Vol privé</Text>
                  <Text style={s.rowSub}>
                    {booking.passengerCount} passager(s) × {formatEuro(flightUnitCents)}
                  </Text>
                </View>
                <Text style={s.rowText}>{formatEuro(booking.flightTotalCents)}</Text>
              </View>
              <View style={s.totalRow}>
                <View>
                  <Text style={s.totalLabel}>TOTAL DU SÉJOUR</Text>
                  <Text style={s.rowSub}>Billets d&apos;avion inclus</Text>
                </View>
                <Text style={s.totalValue}>{formatEuro(booking.totalCents)}</Text>
              </View>
            </View>
          </View>

          <Text style={s.footer}>{EVENT.agencyName}</Text>
        </View>
      </Page>
    </Document>
  );
}

async function loadHotelMeta(booking: Booking): Promise<HotelMeta> {
  try {
    const hotels = await getHotels();
    const h = hotels.find((x) => x.id === booking.hotelId);
    if (!h) return {};
    const meta: HotelMeta = { location: h.location, stars: h.stars };
    const photo = h.photos?.[0];
    if (photo && photo.startsWith("/")) {
      try {
        const buf = await readFile(path.join(process.cwd(), "public", photo));
        const ext = photo.toLowerCase().endsWith(".png") ? "png" : "jpeg";
        meta.photoDataUri = `data:image/${ext};base64,${buf.toString("base64")}`;
      } catch {
        // photo absente : on continue sans image
      }
    }
    return meta;
  } catch {
    return {};
  }
}

/** Genere le carnet de voyage PDF (voucher hotel + billets) pour une reservation. */
export async function travelDocsBuffer(booking: Booking): Promise<Buffer> {
  const hotel = await loadHotelMeta(booking);
  const ref = booking.id.slice(0, 8).toUpperCase();
  const codes = await Promise.all(
    booking.passengers.map((p, i) =>
      QRCode.toDataURL(`TBPA|${ref}|${i + 1}|${p.firstName} ${p.lastName}`, {
        margin: 0,
        width: 160,
        color: { dark: PDF_THEME.navyDeep, light: PDF_THEME.white },
      }).catch(() => ""),
    ),
  );
  return renderToBuffer(<TravelDocs booking={booking} hotel={hotel} codes={codes} />);
}
