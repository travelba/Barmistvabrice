import path from "node:path";
import { Document, Font, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { TRAVEL_BA, type ReservationVoucher, type VoucherLeg } from "@/lib/reservation-voucher";

const C = {
  navy: TRAVEL_BA.navy,
  champagne: TRAVEL_BA.champagne,
  cream: TRAVEL_BA.cream,
  ink: "#0B192C",
  muted: "#5E6A78",
  line: "#E4D9C8",
  white: "#FFFFFF",
};

function fontFile(name: string): string {
  return path.join(process.cwd(), "src/lib/pdf/fonts", name);
}

let fontsReady = false;
function ensureFonts() {
  if (fontsReady) return;
  Font.register({
    family: "Plus Jakarta Sans",
    fonts: [
      { src: fontFile("PlusJakartaSans-Regular.ttf"), fontWeight: 400 },
      { src: fontFile("PlusJakartaSans-Medium.ttf"), fontWeight: 500 },
      { src: fontFile("PlusJakartaSans-SemiBold.ttf"), fontWeight: 600 },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]);
  fontsReady = true;
}

const s = StyleSheet.create({
  page: {
    backgroundColor: C.cream,
    fontFamily: "Plus Jakarta Sans",
    fontWeight: 400,
    color: C.ink,
    paddingBottom: 28,
  },
  header: {
    backgroundColor: C.navy,
    paddingHorizontal: 36,
    paddingTop: 22,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  monogram: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.2,
    borderColor: C.champagne,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  monogramText: { color: C.cream, fontSize: 11, fontWeight: 600, letterSpacing: 0.6 },
  kicker: { color: C.champagne, fontSize: 8, letterSpacing: 2.2, fontWeight: 500 },
  title: { color: C.cream, fontSize: 16, fontWeight: 600, marginTop: 3 },
  sub: { color: "#D9E0E8", fontSize: 9, marginTop: 3 },
  body: { paddingHorizontal: 36, paddingTop: 16 },
  section: { color: C.champagne, fontSize: 8, letterSpacing: 1.8, fontWeight: 600, marginBottom: 8 },
  card: {
    backgroundColor: C.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.line,
    padding: 12,
    marginBottom: 10,
  },
  hotelName: { fontSize: 14, fontWeight: 600 },
  meta: { color: C.muted, fontSize: 9, marginTop: 2 },
  grid: { flexDirection: "row", marginTop: 12 },
  cell: { width: "25%" },
  label: { color: C.muted, fontSize: 7, letterSpacing: 1, fontWeight: 500 },
  value: { fontSize: 10, marginTop: 2, fontWeight: 500 },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  room: { fontSize: 11, fontWeight: 500 },
  tbc: { color: C.muted, fontSize: 9 },
  leg: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  code: { fontSize: 16, fontWeight: 600, width: 70 },
  mid: { flexGrow: 1, alignItems: "center" },
  flightNo: { fontSize: 8, letterSpacing: 1, color: C.muted },
  line: { height: 1, backgroundColor: C.champagne, width: 80, marginVertical: 3 },
  traveller: { fontSize: 11, fontWeight: 500, marginTop: 4 },
  footer: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  footerLine: { color: C.muted, fontSize: 8, textAlign: "center", marginTop: 2 },
});

function Field({ label, value, width }: { label: string; value: string; width?: string }) {
  return (
    <View style={width ? [s.cell, { width }] : s.cell}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{value}</Text>
    </View>
  );
}

function Leg({ label, leg }: { label: string; leg: VoucherLeg }) {
  return (
    <View style={{ marginTop: 8 }}>
      <Text style={s.label}>{label}</Text>
      <View style={s.leg}>
        <View style={{ width: 120 }}>
          <Text style={s.code}>{leg.fromCode}</Text>
          <Text style={s.meta}>{leg.fromCity}</Text>
          <Text style={s.value}>{leg.depTime}</Text>
        </View>
        <View style={s.mid}>
          <Text style={s.flightNo}>{leg.flightNo}</Text>
          <View style={s.line} />
          <Text style={s.meta}>{leg.dateLabel}</Text>
          <Text style={s.meta}>Embarquement {leg.boarding}</Text>
        </View>
        <View style={{ width: 120, alignItems: "flex-end" }}>
          <Text style={s.code}>{leg.toCode}</Text>
          <Text style={s.meta}>{leg.toCity}</Text>
          <Text style={s.value}>{leg.arrTime}</Text>
        </View>
      </View>
    </View>
  );
}

function VoucherDocument({ voucher }: { voucher: ReservationVoucher }) {
  const hotelLine = [voucher.hotel.location, voucher.hotel.stars ? `${voucher.hotel.stars} étoiles` : null]
    .filter(Boolean)
    .join(" · ");
  return (
    <Document
      title={`Confirmation de réservation — ${voucher.groupName}`}
      author={TRAVEL_BA.name}
    >
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={s.monogram}>
            <Text style={s.monogramText}>TBA</Text>
          </View>
          <View>
            <Text style={s.kicker}>CONFIRMATION DE RÉSERVATION / VOUCHER</Text>
            <Text style={s.title}>{TRAVEL_BA.name}</Text>
            <Text style={s.sub}>
              {TRAVEL_BA.legalName} · Réf. {voucher.reference}
            </Text>
          </View>
        </View>

        <View style={s.body}>
          <Text style={s.section}>HÉBERGEMENT</Text>
          <View style={s.card}>
            <Text style={s.hotelName}>{voucher.hotel.name}</Text>
            {hotelLine ? <Text style={s.meta}>{hotelLine}</Text> : null}
            <View style={s.grid}>
              <Field label="ARRIVÉE" value={voucher.hotel.checkIn} width="50%" />
              <Field label="DÉPART" value={voucher.hotel.checkOut} width="50%" />
            </View>
            <View style={s.grid}>
              <Field label="NUITS" value={String(voucher.hotel.nights)} width="50%" />
              <Field
                label="HORAIRES"
                value={`${voucher.hotel.checkInTime} / ${voucher.hotel.checkOutTime}`}
                width="50%"
              />
            </View>
            {voucher.hotel.rooms.map((room, i) => (
              <View style={s.row} key={i}>
                <Text style={s.room}>
                  {room.quantity} × {room.name}
                </Text>
              </View>
            ))}
            <Text style={[s.tbc, { marginTop: 8 }]}>
              Confirmation hôtel : {voucher.hotel.confirmationNumber}
            </Text>
            <Text style={[s.meta, { marginTop: 6 }]}>Réservation au nom de {voucher.groupName}</Text>
          </View>

          <Text style={s.section}>VOL</Text>
          <View style={s.card}>
            {voucher.flight ? (
              <View>
                <Text style={s.room}>{voucher.flight.carrier}</Text>
                <Text style={s.meta}>{voucher.flight.aircraft}</Text>
                <Text style={[s.meta, { marginTop: 4 }]}>
                  {voucher.flight.seatsPaid} place{voucher.flight.seatsPaid > 1 ? "s" : ""} aller-retour
                  {voucher.flight.passengerAssignment === "TBC"
                    ? " · attribution nominative TBC"
                    : ""}
                </Text>
                <Leg label="ALLER" leg={voucher.flight.outbound} />
                <Leg label="RETOUR" leg={voucher.flight.inbound} />
                <Text style={[s.tbc, { marginTop: 8 }]}>PNR : {voucher.flight.pnr}</Text>
              </View>
            ) : (
              <Text style={s.meta}>Aucun vol n&apos;est compris dans cette réservation.</Text>
            )}
          </View>

          <Text style={s.section}>VOYAGEURS</Text>
          <View style={s.card}>
            {voucher.travellers.length === 0 ? (
              <Text style={s.tbc}>TBC</Text>
            ) : (
              voucher.travellers.map((p, i) => (
                <Text style={s.traveller} key={i}>
                  {p.firstName} {p.lastName}
                  {"  ·  "}
                  {p.dateOfBirth === "TBC" ? "né(e) le TBC" : `né(e) le ${p.dateOfBirth}`}
                </Text>
              ))
            )}
            <Text style={[s.meta, { marginTop: 8 }]}>
              Contact réservation : {voucher.contactEmail || "TBC"}
              {voucher.contactPhone ? ` · ${voucher.contactPhone}` : ""}
            </Text>
          </View>

          <View style={s.footer} wrap={false}>
            <Text style={s.footerLine}>
              {TRAVEL_BA.name} — {TRAVEL_BA.legalName}
            </Text>
            <Text style={s.footerLine}>{TRAVEL_BA.address}</Text>
            <Text style={s.footerLine}>
              IATA {TRAVEL_BA.iata} · Atout France {TRAVEL_BA.atoutFrance}
            </Text>
            <Text style={s.footerLine}>
              {TRAVEL_BA.phone} · {TRAVEL_BA.email} · {TRAVEL_BA.web}
            </Text>
            <Text style={s.footerLine}>Référence dossier {voucher.bookingId}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function reservationVoucherBuffer(voucher: ReservationVoucher): Promise<Buffer> {
  ensureFonts();
  return renderToBuffer(<VoucherDocument voucher={voucher} />);
}
