"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  ContactInfo,
  HotelAvailability,
  Passenger,
  PriceBreakdown,
} from "@/lib/types";

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

export function WizardProvider({ children }: { children: React.ReactNode }) {
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

  const setRoomQty = useCallback((roomTypeId: string, qty: number) => {
    setRooms((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[roomTypeId];
      else next[roomTypeId] = qty;
      return next;
    });
  }, []);

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
        return roomsCount > 0;
      case 3:
        return true;
      default:
        return false;
    }
  }, [step, contact, emailValid, hotelId, roomsCount, passengers]);

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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      if (data.url) {
        window.location.href = data.url;
      } else if (data.demo && data.bookingId) {
        window.location.href = `/confirmation?demo=1&booking_id=${data.bookingId}`;
      } else {
        throw new Error("Réponse inattendue");
      }
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Erreur lors du paiement");
      setSubmitting(false);
    }
  }, [contact, hotelId, rooms, passengers, ceremonyAttending, ceremonyGuestCount]);

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
