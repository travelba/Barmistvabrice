"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { preload } from "react-dom";
import Image from "next/image";
import { useI18n } from "@/i18n/I18nProvider";
import { resolveHotelByKey, resolveRoomByName } from "@/lib/hotel-match";
import type { HotelAvailability } from "@/lib/types";
import "./card2.css";
import "./card2-hotel.css";
import "./card2-detail.css";

/* ------------------------------------------------------------------ */
/*  Contenu FR / HE — repris mot pour mot de week-end.html            */
/* ------------------------------------------------------------------ */

const TARGET = new Date("2026-10-09T08:00:00").getTime();

type Loc = "fr" | "he";

const CONTENT = {
  fr: {
    overlaySubtitle: "Bar Mitsvah",
    overlayName: "Shon Bechet",
    overlayCta: "Voir l'invitation",
    flag: "/img/flag-israel.svg",
    flagLabel: "Version hébreu",
    nav: { home: "Accueil", program: "Programme", teph: "Téphilines" },
    grandPrefix: "M. et Mme",
    grandNames: "Maurice & Maryvonne Bechet",
    line2: "Limor & Brice",
    line3: "Emy & Shay",
    mainText:
      "Vous convient au week-end organisé en l’honneur de leur petit-fils, fils et frère",
    tributeText: "Une pensée particulière pour",
    tributeNames: "Asher & Myriam Elgrably",
    saveTitle: "Save The Date",
    saveDate: "Vendredi 9 Octobre 2026",
    cd: { days: "Jours", hours: "Heures", minutes: "Minutes", seconds: "Secondes" },
    programTitle: "Programme",
    hotelsTitle: "L'Hôtel",
    flightTitle: "L'Avion",
    flightNote:
      "Pour célébrer ensemble la Bar Mitsvah de notre fils, nous vous remercions de bien vouloir réserver votre place sur l’avion prévu pour l’aller et le retour. Votre présence nous est précieuse et cette organisation nous permettra de partager ce moment dans les meilleures conditions.",
    detail: "Détails",
    back: "← Retour",
    reserve: "Réserver",
    soldout: "Complet",
    soldoutNote: "Cette chambre n'est plus disponible.",
    lastOnes: (n: number) => `Plus que ${n} disponible${n > 1 ? "s" : ""}`,
    scrollHint: "Faites défiler pour voir toutes les chambres",
  },
  he: {
    overlaySubtitle: "בר מצווה",
    overlayName: "שון בשה",
    overlayCta: "לצפייה בהזמנה",
    flag: "/img/flag-france.svg",
    flagLabel: "Version française",
    nav: { home: "בית", program: "תוכנית", teph: "תפילין" },
    grandPrefix: "מר ומרת",
    grandNames: "מוריס ומריוון בשה",
    line2: "לימור ובריס",
    line3: "אמי ושי",
    mainText: "מתכבדים להזמינכם לסוף השבוע שייערך לכבוד נכדם, בנם ואחיהם",
    tributeText: "במחשבה מיוחדת על",
    tributeNames: "אשר ומרים אלגרבלי",
    saveTitle: "שמרו את התאריך",
    saveDate: "יום שישי 9 באוקטובר 2026",
    cd: { days: "ימים", hours: "שעות", minutes: "דקות", seconds: "שניות" },
    programTitle: "תוכנית",
    hotelsTitle: "המלון",
    flightTitle: "המטוס",
    flightNote:
      "כדי לחגוג יחד את בר המצווה של בננו, נודה לכם שתזמינו את מקומכם בטיסה המתוכננת הלוך ושוב. נוכחותכם יקרה לנו, וההתארגנות הזו תאפשר לנו לחלוק את הרגע הזה בתנאים הטובים ביותר.",
    detail: "פרטים",
    back: "חזרה ←",
    reserve: "להזמין",
    soldout: "מלא",
    soldoutNote: "חדר זה אינו זמין יותר.",
    lastOnes: (n: number) => `נותרו רק ${n}`,
    scrollHint: "גללו כדי לראות את כל החדרים",
  },
};

type ProgItem = { time: string; fr: string; he: string };
type ProgDay = { fr: string; he: string; items: ProgItem[] };

const PROGRAM: ProgDay[] = [
  {
    fr: "Vendredi 9/10",
    he: "יום שישי 9/10",
    items: [
      { time: "07h20", fr: "Rendez-vous à l’aéroport Roissy Charles de Gaulle", he: "מפגש בשדה התעופה רואסי שארל דה גול" },
      { time: "09h15", fr: "Décollage à destination de Mykonos", he: "המראה למיקונוס" },
      { time: "13h30", fr: "Arrivée à Mykonos", he: "נחיתה במיקונוס" },
      { time: "", fr: "Transfert organisé vers l’hôtel Santa Marina", he: "העברה מאורגנת למלון Santa Marina" },
      { time: "", fr: "Après-midi détente", he: "אחר הצהריים של מנוחה" },
      { time: "18h30", fr: "Entrée de Shabbat, allumage des bougies et prière dans la Salle Blanche de l'hotel Santa Marina.", he: "כניסת שבת, הדלקת נרות ותפילה באולם הלבן של מלון Santa Marina." },
      { time: "20h00", fr: "Dîner de Shabbat au restaurant ELAIS de l'hôtel Santa Marina", he: "סעודת שבת במסעדת ELAIS במלון Santa Marina" },
    ],
  },
  {
    fr: "Samedi 10/10",
    he: "שבת 10/10",
    items: [
      { time: "08h00", fr: "Ouverture du petit déjeuner", he: "פתיחת ארוחת הבוקר" },
      { time: "09h00", fr: "Office de Shabbat dans la Salle Blanche : lecture de la Torah", he: "תפילת שבת באולם הלבן: קריאת התורה" },
      { time: "13h00", fr: "Déjeuner de Shabbat au restaurant ELAIS de l'hôtel Santa Marina", he: "ארוחת צהריים של שבת במסעדת ELAIS במלון Santa Marina" },
      { time: "15h30", fr: "Liberté...", he: "זמן חופשי" },
      { time: "19h20", fr: "Havdala dans la villa du Bar Mitsvah", he: "הבדלה בוילה של בר המצווה" },
      { time: "20h30", fr: "Apéritif autour de la piscine de l'hôtel", he: "קוקטייל סביב בריכת המלון" },
      { time: "21h30", fr: "Soirée au BOUDDHA BAR BEACH", he: "ערב ב-BUDDHA BAR BEACH" },
    ],
  },
  {
    fr: "Dimanche 11/10",
    he: "יום ראשון 11/10",
    items: [
      { time: "08h00", fr: "Ouverture du petit déjeuner", he: "פתיחת ארוחת הבוקר" },
      { time: "12h00", fr: "Beach Party à la plage de l'hôtel Santa Marina", he: "מסיבת חוף בחוף המלון Santa Marina" },
      { time: "17h30", fr: "Transfert organisé vers l’aéroport de Mykonos", he: "העברה מאורגנת לשדה התעופה של מיקונוס" },
      { time: "19h30", fr: "Décollage à destination de Roissy Charles de Gaulle", he: "המראה לרואסי שארל דה גול" },
      { time: "22h30", fr: "Arrivée Roissy Charles de Gaulle", he: "נחיתה ברואסי שארל דה גול" },
    ],
  },
];

/* Cartes hôtels affichées dans la vitrine. */
const HOTEL_CARDS: { key: string; name: string; img: string; w: number; h: number }[] = [
  { key: "hotelB", name: "Santa Marina - Mykonos", img: "/img/AerialandBeachSantaMarina.jpg", w: 1216, h: 560 },
];
const FLIGHT_CARD = { key: "avion", name: "Boeing 737-800", img: "/img/avion.jpeg", w: 678, h: 443 };

type Room = { name: string; capacity: string; price: string; images: string[] };
type Hotel = { name: string; rooms: Room[] };
type HotelsData = Record<string, Hotel>;

function resolveImg(src: string): string {
  return src.startsWith("http") ? src : "/" + src.replace(/^\/+/, "");
}

export interface VoyageInvitationProps {
  locale: Loc;
  /** URL vers la version dans l'autre langue (drapeau). */
  flagHref: string;
  /** URL de la page téphilines correspondante (lien de nav). */
  tephilinesHref: string;
}

export function VoyageInvitation({ locale, flagHref, tephilinesHref }: VoyageInvitationProps) {
  const { setLocale } = useI18n();
  const c = CONTENT[locale];

  // La texture lin est un background CSS : le navigateur ne la decouvre
  // qu'apres parsing du CSS. Le preload la telecharge des le debut du rendu.
  preload("/img/light_linen.webp", { as: "image" });

  useEffect(() => {
    setLocale(locale);
  }, [locale, setLocale]);

  /* --------------------------- Overlay d'accueil ----------------- */
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    // Verrouiller aussi <html> : globals.css pose overflow-x sur html, ce qui
    // empeche l'overflow du body de se propager au viewport — sans ce verrou,
    // la molette fait defiler la page derriere la couverture (desktop).
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);

  /* --------------------------- Musique --------------------------- */
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [musicVisible, setMusicVisible] = useState(false);
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = 0.5;
  }, []);
  const playAudio = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    a.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  }, []);
  const reveal = useCallback(() => {
    setRevealed(true);
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "auto";
    // Toujours demarrer l'invitation en haut de page.
    window.scrollTo(0, 0);
    window.setTimeout(() => setMusicVisible(true), 750);
    playAudio();
  }, [playAudio]);
  const toggleMusic = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying) {
      a.pause();
      setIsPlaying(false);
    } else {
      playAudio();
    }
  }, [isPlaying, playAudio]);

  /* -------------------------- Compte à rebours ------------------- */
  const [cd, setCd] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    function tick() {
      const diff = TARGET - Date.now();
      if (diff <= 0) {
        setCd({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setCd({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    }
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  const pad = (n: number) => String(n).padStart(2, "0");

  /* --------------------------- Overlay hôtels -------------------- */
  const [hotels, setHotels] = useState<HotelsData | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [roomIndex, setRoomIndex] = useState(0);
  const [imageIndex, setImageIndex] = useState(0);
  const scrollYRef = useRef(0);

  useEffect(() => {
    const src = locale === "he" ? "/data/hotels-hebrew.json" : "/data/hotels.json";
    fetch(src)
      .then((r) => r.json())
      .then((d: HotelsData) => setHotels(d))
      .catch(() => setHotels(null));
  }, [locale]);

  /* Disponibilités réelles (/api/hotels) superposées au contenu statique :
     permet d'afficher "Complet" et de bloquer la réservation d'une chambre
     épuisée directement depuis la vitrine. En cas d'échec, on n'affiche
     simplement aucune information de stock. */
  const [liveHotels, setLiveHotels] = useState<HotelAvailability[]>([]);
  useEffect(() => {
    fetch("/api/hotels", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.hotels) setLiveHotels(d.hotels as HotelAvailability[]);
      })
      .catch(() => {});
  }, []);

  /** Chambres restantes pour (hotelKey, roomName) ; null = inconnu. */
  const roomAvailability = useCallback(
    (hotelKey: string | null, roomName: string | undefined): number | null => {
      if (!hotelKey || hotelKey === "avion" || !roomName || liveHotels.length === 0) {
        return null;
      }
      const hotel = resolveHotelByKey(hotelKey, liveHotels);
      if (!hotel) return null;
      const rt = resolveRoomByName(hotel, roomName);
      return rt ? rt.available : null;
    },
    [liveHotels],
  );

  const openHotel = useCallback((key: string) => {
    setOpenKey(key);
    setRoomIndex(0);
    setImageIndex(0);
    scrollYRef.current = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollYRef.current}px`;
    document.body.style.width = "100%";
  }, []);

  const closeHotel = useCallback(() => {
    setOpenKey(null);
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
    const html = document.documentElement;
    const prev = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";
    window.scrollTo(0, scrollYRef.current);
    html.style.scrollBehavior = prev;
  }, []);

  /* Depuis la fiche avion, « Réserver » ramène au choix des hôtels juste
     en dessous : le parcours continue sur la page (pas de tunnel ici). */
  const reserveFlight = useCallback(() => {
    closeHotel();
    requestAnimationFrame(() => {
      document.getElementById("choix-hotels")?.scrollIntoView({ behavior: "smooth" });
    });
  }, [closeHotel]);

  const currentHotel = openKey && hotels ? hotels[openKey] : null;
  const currentRoom = currentHotel?.rooms[roomIndex] ?? null;
  const isFlight = openKey === "avion";
  const currentAvailability = roomAvailability(openKey, currentRoom?.name);
  const currentSoldOut = currentAvailability === 0;

  const prevImg = useCallback(() => {
    if (!currentRoom) return;
    setImageIndex((i) => (i - 1 + currentRoom.images.length) % currentRoom.images.length);
  }, [currentRoom]);
  const nextImg = useCallback(() => {
    if (!currentRoom) return;
    setImageIndex((i) => (i + 1) % currentRoom.images.length);
  }, [currentRoom]);

  return (
    <div className="card2-page">
      <audio ref={audioRef} src="/music/we.mp3" loop preload="auto" />

      {/* Overlay d'accueil */}
      <div
        id="overlay"
        className="overlay"
        style={{ opacity: revealed ? 0 : 1, pointerEvents: revealed ? "none" : "auto" }}
      >
        <div id="overlay-content" className="overlay-content">
          <Image
            src="/img/logo_shine_marron_sans_fond.png"
            width={1000}
            height={1111}
            className="overlay-logo"
            alt="Logo"
            priority
          />
          <p className="overlay-subtitle">
            {c.overlaySubtitle}
            <br />
            <span className="overlay-name">{c.overlayName}</span>
          </p>
          <p className="overlay-guest" id="guest-name"></p>
          <button id="open-invitation" className="overlay-button" onClick={reveal}>
            {c.overlayCta}
          </button>
        </div>
      </div>

      {/* Bouton musique */}
      <button
        id="music-toggle"
        className="music-toggle"
        aria-label="Controle musique"
        aria-pressed={isPlaying}
        onClick={toggleMusic}
        style={{ display: musicVisible ? "flex" : "none" }}
      >
        <i className="music-icon fas fa-play" aria-hidden="true" style={{ display: isPlaying ? "none" : "block" }} />
        <i className="music-icon fas fa-pause" aria-hidden="true" style={{ display: isPlaying ? "block" : "none" }} />
      </button>

      {/* Changement de langue */}
      <a href={flagHref} className="language-switch" aria-label={c.flagLabel} title={c.flagLabel}>
        <Image src={c.flag} width={52} height={52} alt="" />
      </a>

      {/* Navigation */}
      <nav className="navbar">
        <div className="navbar-content">
          <a href="#top" className="nav-link">
            {c.nav.home}
          </a>
          <a href="#programme" className="nav-link">
            {c.nav.program}
          </a>
          <a href={tephilinesHref} className="nav-link">
            {c.nav.teph}
          </a>
        </div>
      </nav>

      {/* Présentation */}
      <section className="section" id="top">
        <div className="presentation-box">
          <div className="hebrew-letter">בס״ד</div>
          <div className="presentation-content">
            <p className="presentation-line grandparents-line">
              {c.grandPrefix}
              <br />
              <strong className="names-large">{c.grandNames}</strong>
            </p>
            <p className="presentation-line">
              <strong>{c.line2}</strong>
            </p>
            <p className="presentation-line">
              <strong>{c.line3}</strong>
            </p>

            <div className="presentation-main">
              <p className="main-text">{c.mainText}</p>
              <Image src="/img/nom_marron.png" width={785} height={318} alt="Shon" className="bar-mitsvah-image" />
            </div>

            <div className="tribute">
              <p className="tribute-text">{c.tributeText}</p>
              <p className="tribute-names">
                <strong>{c.tributeNames}</strong>
              </p>
            </div>
          </div>
          <Image src="/img/logo_shine_marron_sans_fond.png" width={1000} height={1111} alt="Logo" className="section-logo-bg" />
        </div>
      </section>

      {/* Save The Date */}
      <section id="save-the-date" className="save-the-date-section">
        <div className="save-the-date-content">
          <h2 className="save-the-date-title">{c.saveTitle}</h2>
          <p className="save-the-date-date">{c.saveDate}</p>
          <div className="countdown">
            <div className="countdown-item">
              <span className="countdown-number">{cd.days}</span>
              <span className="countdown-label">{c.cd.days}</span>
            </div>
            <div className="countdown-item">
              <span className="countdown-number">{pad(cd.hours)}</span>
              <span className="countdown-label">{c.cd.hours}</span>
            </div>
            <div className="countdown-item">
              <span className="countdown-number">{pad(cd.minutes)}</span>
              <span className="countdown-label">{c.cd.minutes}</span>
            </div>
            <div className="countdown-item">
              <span className="countdown-number">{pad(cd.seconds)}</span>
              <span className="countdown-label">{c.cd.seconds}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Programme */}
      <section className="section programme-section" id="programme">
        <div className="programme-container">
          <h2 className="programme-title">{c.programTitle}</h2>
          {PROGRAM.map((day) => (
            <div className="timeline-day" key={day.fr}>
              <h3 className="timeline-day-title scroll-item scroll-visible">
                {locale === "he" ? day.he : day.fr}
              </h3>
              <div className="timeline">
                {day.items.map((it, i) => (
                  <div className="timeline-item scroll-item scroll-visible" key={i}>
                    <span className="time">{it.time || " "}</span>
                    <p className="event">{locale === "he" ? it.he : it.fr}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Avion puis Hôtels : le parcours commence par la réservation du vol */}
      <section id="hotels" className="hotels-section">
        <h2 className="hotels-title flight-section-title">{c.flightTitle}</h2>
        <div className="hotels-grid flight-grid">
          <div className="hotel-card" onClick={() => openHotel(FLIGHT_CARD.key)}>
            <h3 className="hotel-name">{FLIGHT_CARD.name}</h3>
            <div className="hotel-media">
              <Image
                src={FLIGHT_CARD.img}
                width={FLIGHT_CARD.w}
                height={FLIGHT_CARD.h}
                className="hotel-img"
                alt={FLIGHT_CARD.name}
              />
              <button type="button" className="hotel-detail-button">
                <i className="fa-solid fa-circle-info" aria-hidden="true"></i>
                {" "}
                {c.detail}
              </button>
            </div>
          </div>
          <p className="flight-note">{c.flightNote}</p>
          <a href="#choix-hotels" className="hotel-reserve-button flight-reserve-cta">
            {c.reserve}
          </a>
        </div>

        <h2 className="hotels-title" id="choix-hotels">{c.hotelsTitle}</h2>
        <div className="hotels-grid">
          {HOTEL_CARDS.map((h) => (
            <div key={h.key} className="hotel-card" onClick={() => openHotel(h.key)}>
              <h3 className="hotel-name">{h.name}</h3>
              <div className="hotel-media">
                <Image src={h.img} width={h.w} height={h.h} className="hotel-img" alt={h.name} />
                <button type="button" className="hotel-detail-button">
                  <i className="fa-solid fa-circle-info" aria-hidden="true"></i>
                  {" "}
                  {c.detail}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Overlay Hôtels */}
      <div className={"hotel-overlay" + (openKey ? " show" : "") + (isFlight ? " flight-overlay" : "")}>
        <div className="hotel-overlay-nav">
          <button className="hotel-close" id="close-hotel" onClick={closeHotel}>
            {c.back}
          </button>
        </div>

        <div className="hotel-overlay-content">
          <h2 id="overlay-hotel-name">{currentHotel?.name}</h2>

          <div className="slider">
            {!isFlight && currentRoom && currentRoom.images.length > 1 && (
              <button id="prev-img" className="nav-btn prev" onClick={prevImg} type="button">
                ‹
              </button>
            )}
            {currentRoom && (
              <Image
                id="slider-img"
                src={resolveImg(currentRoom.images[imageIndex])}
                width={800}
                height={800}
                alt={currentRoom.name}
              />
            )}
            {!isFlight && currentRoom && currentRoom.images.length > 1 && (
              <button id="next-img" className="nav-btn next" onClick={nextImg} type="button">
                ›
              </button>
            )}
          </div>

          <div className="room-info">
            <h3 id="room-name">{currentRoom?.name}</h3>
            {currentRoom?.capacity && <p id="room-capacity">{currentRoom.capacity}</p>}
            <p id="room-price">{currentRoom?.price}</p>
            {currentSoldOut ? (
              <p className="room-availability room-availability-soldout">
                {c.soldout} — {c.soldoutNote}
              </p>
            ) : currentAvailability !== null && currentAvailability <= 2 ? (
              <p className="room-availability room-availability-low">
                {c.lastOnes(currentAvailability)}
              </p>
            ) : null}
          </div>

          {!isFlight && currentHotel && currentHotel.rooms.length > 1 && (
            <>
              {currentHotel.rooms.length > 5 && (
                <p id="room-scroll-hint" className="room-scroll-hint">
                  {c.scrollHint}
                </p>
              )}
              <div className={"room-buttons" + (currentHotel.rooms.length > 5 ? " scrollable-rooms" : "")}>
                {currentHotel.rooms.map((room, i) => {
                  const soldOut = roomAvailability(openKey, room.name) === 0;
                  return (
                    <button
                      key={i}
                      type="button"
                      className={
                        (i === roomIndex ? "active" : "") + (soldOut ? " room-soldout" : "")
                      }
                      onClick={() => {
                        setRoomIndex(i);
                        setImageIndex(0);
                      }}
                    >
                      {room.name}
                      {soldOut ? ` — ${c.soldout}` : ""}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Formulaire d'inscription : la sélection (hôtel + chambre) mène au
              tunnel de paiement Stripe, avec pré-sélection via query params.
              Une chambre épuisée ne peut pas être réservée depuis la vitrine. */}
          {currentSoldOut ? (
            <span className="hotel-reserve-button hotel-reserve-button-disabled" aria-disabled="true">
              {c.soldout}
            </span>
          ) : isFlight ? (
            <button type="button" className="hotel-reserve-button" onClick={reserveFlight}>
              {c.reserve}
            </button>
          ) : (
            <a
              className="hotel-reserve-button"
              href={
                `/reservation?hotel=${encodeURIComponent(openKey ?? "")}` +
                (currentRoom ? `&room=${encodeURIComponent(currentRoom.name)}` : "") +
                `&lang=${locale}`
              }
            >
              {c.reserve}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
