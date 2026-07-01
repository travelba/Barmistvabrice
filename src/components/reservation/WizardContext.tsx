"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ContactInfo,
  HotelAvailability,
  Passenger,
  PriceBreakdown,
} from "@/lib/types";
import { useI18n } from "@/i18n/I18nProvider";

export interface FlightInfo {
  pricePerPassengerCents: number;
  origin: string;
  destination: string;
  outboundDate: string;
  returnDate: string;
  carrierName: string;
}

interface WizardValue {
  loading: boolean;
  error: string | null;
  hotels: HotelAvailability[];
  flight: FlightInfo | null;
  nights: number;

  step: number;
  goNext: () => void;
  goBack: () => void;
  goTo: (n: number) => void;

  contact: ContactInfo;
  setContact: (c: Partial<ContactInfo>) => void;

  hotelId: string | null;
  setHotelId: (id: string) => void;
  selectedHotel: HotelAvailability | null;

  rooms: Record<string, number>;
  setRoomQty: (roomTypeId: string, qty: number) => void;
  roomsCount: number;
  selectedCapacity: number;

  passengers: Passenger[];
  addPassenger: () => void;
  updatePassenger: (index: number, p: Partial<Passenger>) => void;
  removePassenger: (index: number) => void;

  ceremonyAttending: boolean;
  setCeremonyAttending: (v: boolean) => void;
  ceremonyGuestCount: number;
  setCeremonyGuestCount: (n: number) => void;

  price: PriceBreakdown | null;

  submitting: boolean;
  submitError: string | null;
  submit: () => Promise<void>;

  canContinue: boolean;
}

const Ctx = createContext<WizardValue | null>(null);

const STEP_COUNT = 4;

/* Correspondance entre les cles de la page voyage (/data/hotels.json :
   hotelA, hotelB…) et les hotels du tunnel (/api/hotels), robuste aux
   differences d'identifiants (demo vs Supabase) : on retombe sur une
   recherche par id/nom normalise si la cle n'est pas un id direct. */
const HOTEL_KEY_ALIASES: Record<string, string[]> = {
  hotelA: ["once", "once in mykonos"],
  hotelB: ["santa-marina", "santa marina"],
};
const normalizeKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
function resolveHotelByKey(
  key: string,
  hotels: HotelAvailability[],
): HotelAvailability | null {
  const direct = hotels.find((h) => h.id === key);
  if (direct) return direct;
  const wanted = (HOTEL_KEY_ALIASES[key] ?? [key]).map(normalizeKey);
  return (
    hotels.find((h) => {
      const hid = normalizeKey(h.id);
      const hname = normalizeKey(h.name);
      return wanted.some((w) => w.length > 0 && (hid.includes(w) || hname.includes(w)));
    }) ?? null
  );
}

export function WizardProvider({
  children,
  variant = "new",
}: {
  children: React.ReactNode;
  variant?: "new" | "classic";
}) {
  const { locale } = useI18n();
  const basePath = variant === "classic" ? "/classic" : "";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hotels, setHotels] = useState<HotelAvailability[]>([]);
  const [flight, setFlight] = useState<FlightInfo | null>(null);
  const [nights, setNights] = useState(1);

  const [step, setStep] = useState(0);
  const [contact, setContactState] = useState<ContactInfo>({ groupName: "", email: "", phone: "" });
  const [hotelId, setHotelIdState] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Record<string, number>>({});
  const [passengers, setPassengers] = useState<Passenger[]>([
    { firstName: "", lastName: "", dateOfBirth: "" },
  ]);
  const [ceremonyAttending, setCeremonyAttending] = useState(true);
  const [ceremonyGuestCount, setCeremonyGuestCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /* Pré-sélection depuis la page voyage : ?hotel=<cle>&room=<nom>.
     Lue une seule fois (navigation par rechargement complet depuis /week-end). */
  const prefillRef = useRef<{ hotel: string | null; room: string | null }>(
    typeof window === "undefined"
      ? { hotel: null, room: null }
      : {
          hotel: new URLSearchParams(window.location.search).get("hotel"),
          room: new URLSearchParams(window.location.search).get("room"),
        },
  );
  const prefillApplied = useRef(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/hotels", { cache: "no-store" });
        if (!res.ok) throw new Error("load");
        const data = await res.json();
        if (!active) return;
        setHotels(data.hotels);
        setFlight(data.flight);
        if (data.nights) setNights(data.nights);
      } catch {
        if (active) setError("Impossible de charger les disponibilités.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const setContact = useCallback((c: Partial<ContactInfo>) => {
    setContactState((prev) => ({ ...prev, ...c }));
  }, []);

  const setHotelId = useCallback((id: string) => {
    setHotelIdState((prev) => {
      if (prev !== id) setRooms({}); // reset chambres si on change d'hotel
      return id;
    });
  }, []);

  const selectedHotel = useMemo(
    () => hotels.find((h) => h.id === hotelId) ?? null,
    [hotels, hotelId],
  );

  /* Applique la pré-sélection hôtel + chambre une fois les dispos chargées.
     On ne change PAS d'étape : les coordonnées/participants (étape 0) restent
     obligatoires avant le paiement — l'hôtel et la chambre sont simplement
     déjà cochés quand l'utilisateur atteint les étapes correspondantes. */
  useEffect(() => {
    if (prefillApplied.current) return;
    const { hotel: hotelKey, room: roomName } = prefillRef.current;
    if (!hotelKey || hotels.length === 0) return;
    const target = resolveHotelByKey(hotelKey, hotels);
    if (!target) return;
    prefillApplied.current = true;
    setHotelIdState(target.id);
    if (roomName && target.remaining > 0) {
      const wanted = normalizeKey(roomName);
      const rt =
        target.roomTypes.find((r) => normalizeKey(r.name) === wanted) ??
        target.roomTypes.find((r) => normalizeKey(r.name).includes(wanted));
      if (rt && rt.available > 0) setRooms({ [rt.id]: 1 });
    }
  }, [hotels]);

  const setRoomQty = useCallback(
    (roomTypeId: string, qty: number) => {
      setRooms((prev) => {
        const next = { ...prev };
        // On ne peut pas reserver plus de chambres que de participants.
        const maxRooms = passengers.length;
        const others = Object.entries(prev).reduce(
          (acc, [id, q]) => (id === roomTypeId ? acc : acc + q),
          0,
        );
        const allowed = Math.max(0, maxRooms - others);
        const clamped = Math.min(Math.max(0, qty), allowed);
        if (clamped <= 0) delete next[roomTypeId];
        else next[roomTypeId] = clamped;
        return next;
      });
    },
    [passengers.length],
  );

  const roomsCount = useMemo(
    () => Object.values(rooms).reduce((a, b) => a + b, 0),
    [rooms],
  );

  const selectedCapacity = useMemo(() => {
    if (!selectedHotel) return 0;
    return Object.entries(rooms).reduce((acc, [id, qty]) => {
      const rt = selectedHotel.roomTypes.find((r) => r.id === id);
      return acc + (rt ? rt.capacity * qty : 0);
    }, 0);
  }, [rooms, selectedHotel]);

  const addPassenger = useCallback(() => {
    setPassengers((prev) => [...prev, { firstName: "", lastName: "", dateOfBirth: "" }]);
  }, []);
  const updatePassenger = useCallback((index: number, p: Partial<Passenger>) => {
    setPassengers((prev) => prev.map((x, i) => (i === index ? { ...x, ...p } : x)));
  }, []);
  const removePassenger = useCallback((index: number) => {
    setPassengers((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }, []);

  const price = useMemo<PriceBreakdown | null>(() => {
    if (!selectedHotel || !flight) return null;
    const lines = Object.entries(rooms)
      .map(([id, qty]) => {
        const rt = selectedHotel.roomTypes.find((r) => r.id === id);
        if (!rt) return null;
        return {
          roomTypeId: rt.id,
          roomName: rt.name,
          quantity: qty,
          unitCents: rt.priceCents,
          lineCents: rt.priceCents * qty * nights,
        };
      })
      .filter(Boolean) as PriceBreakdown["rooms"];
    const roomsTotalCents = lines.reduce((a, r) => a + r.lineCents, 0);
    const passengerCount = passengers.length;
    const flightTotalCents = passengerCount * flight.pricePerPassengerCents;
    return {
      rooms: lines,
      nights,
      roomsTotalCents,
      passengerCount,
      flightUnitCents: flight.pricePerPassengerCents,
      flightTotalCents,
      totalCents: roomsTotalCents + flightTotalCents,
    };
  }, [rooms, selectedHotel, flight, passengers.length, nights]);

  const emailValid = /.+@.+\..+/.test(contact.email);

  const canContinue = useMemo(() => {
    switch (step) {
      case 0:
        // Participants : coordonnees du responsable + identite de chaque participant.
        return (
          contact.groupName.trim().length > 1 &&
          emailValid &&
          contact.phone.trim().length >= 6 &&
          passengers.length > 0 &&
          passengers.every(
            (p) => p.firstName.trim() && p.lastName.trim() && p.dateOfBirth,
          )
        );
      case 1:
        return Boolean(hotelId);
      case 2:
        // Au moins une chambre ET capacite suffisante pour loger tous les participants.
        return roomsCount > 0 && selectedCapacity >= passengers.length;
      case 3:
        return true;
      default:
        return false;
    }
  }, [step, contact, emailValid, hotelId, roomsCount, selectedCapacity, passengers]);

  const goNext = useCallback(() => setStep((s) => Math.min(STEP_COUNT - 1, s + 1)), []);
  const goBack = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);
  const goTo = useCallback((n: number) => setStep(Math.max(0, Math.min(STEP_COUNT - 1, n))), []);

  const submit = useCallback(async () => {
    if (!hotelId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact,
          hotelId,
          rooms: Object.entries(rooms).map(([roomTypeId, quantity]) => ({ roomTypeId, quantity })),
          passengers,
          ceremonyAttending,
          ceremonyGuestCount,
          locale,
          variant,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      if (data.url) {
        window.location.href = data.url;
      } else if (data.demo && data.bookingId) {
        window.location.href = `${basePath}/confirmation?demo=1&booking_id=${data.bookingId}&lang=${locale}`;
      } else {
        throw new Error("Réponse inattendue");
      }
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Erreur lors du paiement");
      setSubmitting(false);
    }
  }, [contact, hotelId, rooms, passengers, ceremonyAttending, ceremonyGuestCount, locale, variant, basePath]);

  const value: WizardValue = {
    loading,
    error,
    hotels,
    flight,
    nights,
    step,
    goNext,
    goBack,
    goTo,
    contact,
    setContact,
    hotelId,
    setHotelId,
    selectedHotel,
    rooms,
    setRoomQty,
    roomsCount,
    selectedCapacity,
    passengers,
    addPassenger,
    updatePassenger,
    removePassenger,
    ceremonyAttending,
    setCeremonyAttending,
    ceremonyGuestCount,
    setCeremonyGuestCount,
    price,
    submitting,
    submitError,
    submit,
    canContinue,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWizard(): WizardValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWizard must be used within WizardProvider");
  return ctx;
}
