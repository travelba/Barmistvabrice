"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { preload } from "react-dom";
import Image from "next/image";
import { useI18n } from "@/i18n/I18nProvider";
import { defaultCountryForLocale, normalizePhoneE164 } from "@/lib/phone";
import "./card3.css";

/* ------------------------------------------------------------------ */
/*  Contenu FR / HE — repris mot pour mot de teph.html / teph-hebrew  */
/* ------------------------------------------------------------------ */

type Person = { nom: string; prenom: string };

const TARGET = new Date("2026-10-08T09:30:00").getTime();

const CONTENT = {
  fr: {
    dir: "ltr" as const,
    overlaySubtitle: "Bar Mitsvah",
    overlayName: "Shon Bechet",
    overlayCta: "Voir l'invitation",
    flag: "/img/flag-israel.svg",
    flagLabel: "Version hébreu",
    nav: { home: "Accueil", teph: "Téphilines", response: "Réponse", weekend: "Week-end" },
    davidMoshe: "David Moshe",
    grandPrefix: "M. et Mme",
    grandNames: "Maurice & Maryvonne Bechet",
    line2: "Limor & Brice",
    line3: "Emy & Shay",
    mainText:
      "ont la joie de vous faire part de la Bar Mitsvah de leur petit fils, fils et frère",
    tributeText: "Une pensée particulière pour",
    tributeNames: "Asher & Myriam Elgrably",
    saveTitle: "Save The Date",
    saveDate: "Jeudi 8 Octobre 2026",
    cd: { days: "Jours", hours: "Heures", minutes: "Minutes", seconds: "Secondes" },
    sectionTitle: "Téphilines",
    synIntro: ["La mise des Téphilines ", "aura lieu le"],
    synDate: "Jeudi 8 Octobre 2026",
    synLocationPre: "en la",
    synName: "Synagogue Buffault",
    synNameLatin: false,
    synAddress: ["28 rue Buffault,", "75009 Paris"],
    synAddressLatin: false,
    synTime: "à 9h30 (Début de l’office)",
    synDetails: "Un petit déjeuner suivra l’office",
    calendar: "Ajouter au calendrier",
    waze: "Voir l'itinéraire",
    responseTitle: "Réponse",
    rsvp: {
      attendanceQ: "Serez-vous présent ?",
      yes: "Oui",
      no: "Non",
      countTitle: "Nombre de personnes",
      countLabel: "Personnes",
      removeAria: "Retirer une personne",
      addAria: "Ajouter une personne",
      personNote: (n: number, t: number) => `Personne ${n} sur ${t}`,
      participant: "Participant",
      nom: "Nom",
      prenom: "Prénom",
      summaryTitle: "Récapitulatif",
      answeredNo: "Vous avez répondu non.",
      noIntro: "Indiquez votre nom afin que la famille soit informée de votre réponse.",
      countSummary: (n: number) => `${n} ${n > 1 ? "personnes" : "personne"}`,
      phoneLabel: "Téléphone (WhatsApp)",
      phonePlaceholder: "06 12 34 56 78",
      phoneHint: "Vous recevrez votre confirmation par WhatsApp.",
      phoneOptionalHint: "Facultatif — pour recevoir un accusé par WhatsApp.",
      next: "Suivant",
      submit: "Envoyer",
      prev: "Retour",
      sending: "Envoi en cours...",
      success: "Réponse envoyée avec succès.",
      nextTitle: "Et maintenant, le week-end à Mykonos !",
      nextText: "Réservez votre vol et votre hôtel pour poursuivre la fête.",
      nextCta: "Réserver mon week-end",
      errorSend: "Erreur d'envoi. Réessaie dans un instant.",
      errorChoice: "Choisis oui ou non pour continuer.",
      errorPerson: "Complète le nom et le prénom de cette personne.",
      errorPhone: "Indique un numéro de téléphone valide (ex. 06 12 34 56 78 ou +33 6 12 34 56 78).",
    },
  },
  he: {
    dir: "rtl" as const,
    overlaySubtitle: "בר מצווה",
    overlayName: "שון בשה",
    overlayCta: "לצפייה בהזמנה",
    flag: "/img/flag-france.svg",
    flagLabel: "Version française",
    nav: { home: "בית", teph: "תפילין", response: "אישור", weekend: "סוף שבוע" },
    davidMoshe: "דוד משה",
    grandPrefix: "מר ומרת",
    grandNames: "מוריס ומריוון בשה",
    line2: "לימור ובריס",
    line3: "אמי ושי",
    mainText: "שמחים להזמינכם לבר המצווה של נכדם, בנם ואחיהם",
    tributeText: "במחשבה מיוחדת על",
    tributeNames: "אשר ומרים אלגרבלי",
    saveTitle: "שמרו את התאריך",
    saveDate: "יום חמישי 8 באוקטובר 2026",
    cd: { days: "ימים", hours: "שעות", minutes: "דקות", seconds: "שניות" },
    sectionTitle: "תפילין",
    synIntro: ["הנחת התפילין", "תתקיים ביום"],
    synDate: "יום חמישי 8 באוקטובר 2026",
    synLocationPre: "בבית הכנסת",
    synName: "Buffault",
    synNameLatin: true,
    synAddress: ["28 rue Buffault,", "75009 Paris"],
    synAddressLatin: true,
    synTime: "בשעה 9:30 (תחילת התפילה)",
    synDetails: "לאחר התפילה תוגש ארוחת בוקר",
    calendar: "הוסף ליומן",
    waze: "הצג מסלול",
    responseTitle: "אישור הגעה",
    rsvp: {
      attendanceQ: "האם תגיעו?",
      yes: "כן",
      no: "לא",
      countTitle: "מספר אנשים",
      countLabel: "אנשים",
      removeAria: "הסר אדם",
      addAria: "הוסף אדם",
      personNote: (n: number, t: number) => `אדם ${n} מתוך ${t}`,
      participant: "משתתף",
      nom: "שם משפחה",
      prenom: "שם פרטי",
      summaryTitle: "סיכום",
      answeredNo: "השבתם לא.",
      noIntro: "אנא ציינו את שמכם כדי שהמשפחה תעודכן בתשובתכם.",
      countSummary: (n: number) => `${n} ${n > 1 ? "אנשים" : "איש"}`,
      phoneLabel: "טלפון (וואטסאפ)",
      phonePlaceholder: "05X-XXX-XXXX",
      phoneHint: "האישור יישלח אליכם בוואטסאפ.",
      phoneOptionalHint: "לא חובה — לקבלת אישור בוואטסאפ.",
      next: "הבא",
      submit: "שליחה",
      prev: "חזרה",
      sending: "שולח...",
      success: "התשובה נשלחה בהצלחה.",
      nextTitle: "ועכשיו — סוף השבוע במיקונוס!",
      nextText: "הזמינו את הטיסה והמלון כדי להמשיך בחגיגה.",
      nextCta: "להזמנת סוף השבוע",
      errorSend: "שגיאת שליחה. נסו שוב בעוד רגע.",
      errorChoice: "בחרו כן או לא כדי להמשיך.",
      errorPerson: "השלימו שם פרטי ושם משפחה.",
      errorPhone: "נא להזין מספר טלפון תקין (למשל 050-123-4567).",
    },
  },
};

const WAZE_URL =
  "https://ul.waze.com/ul?venue_id=1507817.15340312.12082362&overview=yes&utm_campaign=default&utm_source=waze_website&utm_medium=lm_share_location";

export interface TephilinesInvitationProps {
  /** Langue figée par la route (chaque URL a sa langue, comme le site d'origine). */
  locale: "fr" | "he";
  /** Affiche le lien de navigation « Week-end » (variantes tephilines+voyage). */
  showWeekend: boolean;
  /** URL vers la version dans l'autre langue (drapeau, rechargement complet). */
  flagHref: string;
  /** URL de la page voyage correspondante (si showWeekend). */
  weekendHref?: string;
}

export function TephilinesInvitation({
  locale,
  showWeekend,
  flagHref,
  weekendHref = "/week-end",
}: TephilinesInvitationProps) {
  const { setLocale } = useI18n();
  const c = CONTENT[locale];

  // La texture papier est un background CSS : le navigateur ne la decouvre
  // qu'apres parsing du CSS. Le preload la telecharge des le debut du rendu.
  preload("/img/paper_background.webp", { as: "image" });

  /* La langue est déterminée par la route : on la fixe au montage pour
     aligner dir/lang du document et la locale envoyée au backend RSVP. */
  useEffect(() => {
    setLocale(locale);
  }, [locale, setLocale]);

  /* --------------------------- Overlay --------------------------- */
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
    a.play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
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

  return (
    <>
      <audio ref={audioRef} src="/music/teph.mp3" loop preload="auto" />

      {/* Overlay d'accueil */}
      <div
        id="overlay"
        className="overlay"
        style={{ opacity: revealed ? 0 : 1, pointerEvents: revealed ? "none" : "auto" }}
      >
        <div id="overlay-content" className="overlay-content">
          <Image
            src="/img/logo_shine_sans_fond.png"
            width={234}
            height={260}
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
        <i
          className="music-icon fas fa-play"
          aria-hidden="true"
          style={{ display: isPlaying ? "none" : "block" }}
        />
        <i
          className="music-icon fas fa-pause"
          aria-hidden="true"
          style={{ display: isPlaying ? "block" : "none" }}
        />
      </button>

      {/* Changement de langue — lien vers l'autre langue (rechargement complet
          pour ne pas empiler les feuilles de style entre les deux univers). */}
      <a
        href={flagHref}
        className="language-switch"
        aria-label={c.flagLabel}
        title={c.flagLabel}
      >
        <Image src={c.flag} width={52} height={52} alt="" />
      </a>

      {/* Navigation */}
      <nav className="navbar">
        <div className="navbar-content">
          <a href="#top" className="nav-link">
            {c.nav.home}
          </a>
          <a href="#synagogue-light" className="nav-link">
            {c.nav.teph}
          </a>
          <a href="#reponse" className="nav-link">
            {c.nav.response}
          </a>
          {showWeekend && (
            <a href={weekendHref} className="nav-link">
              {c.nav.weekend}
            </a>
          )}
        </div>
      </nav>

      {/* Présentation */}
      <section className="section" id="top">
        <div className="presentation-box">
          <div className="hebrew-letter">בס״ד</div>

          <Image src="/img/nom.png" width={516} height={209} alt="Shon" className="bar-mitsvah-image" />
          <h2 className="name-david-moshe" style={{ color: "#8a8a8a", fontSize: "60px" }}>
            {c.davidMoshe}
          </h2>
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
            </div>

            <div className="tribute">
              <p className="tribute-text">{c.tributeText}</p>
              <p className="tribute-names">
                <strong>{c.tributeNames}</strong>
              </p>
            </div>
          </div>
          <Image src="/img/logo_shine_sans_fond.png" width={234} height={260} alt="Logo" className="section-logo-bg" />
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

      {/* Synagogue */}
      <section className="section synagogue-light" id="synagogue-light">
        <div className="synagogue-text-silver">
          <div className="hebrew-letter">בס״ד</div>
          <h2 className="section-title">{c.sectionTitle}</h2>
          <Image src="/img/oukchartam.png" width={1684} height={626} alt="Oukchartam" className="oukchartam-image" />
          <p className="synagogue-intro">
            {c.synIntro[0]}
            <br />
            {c.synIntro[1]}
          </p>
          <p className="synagogue-date">{c.synDate}</p>
          <p className="synagogue-location">
            {c.synLocationPre}
            <br />
            {c.synNameLatin ? (
              <span className="synagogue-name latin-text" dir="ltr">
                {c.synName}
              </span>
            ) : (
              <span className="synagogue-name">{c.synName}</span>
            )}
          </p>
          {c.synAddressLatin ? (
            <p className="synagogue-address latin-text" dir="ltr">
              {c.synAddress[0]}
              <br />
              {c.synAddress[1]}
            </p>
          ) : (
            <p className="synagogue-address">
              {c.synAddress[0]}
              <br />
              {c.synAddress[1]}
            </p>
          )}
          <p className="synagogue-time">{c.synTime}</p>
          <p className="synagogue-details">{c.synDetails}</p>
          <a href="/event.ics" download className="calendar-link">
            <i className="fas fa-calendar"></i> {c.calendar}
          </a>
          <a href={WAZE_URL} className="waze-button" target="_blank" rel="noreferrer">
            {c.waze}
          </a>
          <Image src="/img/logo_shine_sans_fond.png" width={234} height={260} alt="Logo" className="section-logo-bg" />
          <br />
        </div>
      </section>

      {/* Réponse */}
      <section className="section response-section" id="reponse">
        <ResponseForm
          content={c}
          locale={locale}
          showWeekend={showWeekend}
          weekendHref={weekendHref}
        />
      </section>
    </>
  );
}

/* ================================================================== */
/*  Formulaire « Réponse » — réplique fidèle du parcours 4 étapes      */
/*  (poste vers /api/rsvp : Supabase + e-mail, au lieu du Google Sheet) */
/* ================================================================== */

function ResponseForm({
  content,
  locale,
  showWeekend,
  weekendHref,
}: {
  content: (typeof CONTENT)["fr"] | (typeof CONTENT)["he"];
  locale: "fr" | "he";
  /** Invitation « téphilines + week-end » : propose la réservation après la réponse. */
  showWeekend: boolean;
  weekendHref: string;
}) {
  const r = content.rsvp;

  const STEP_ATTENDANCE = 1;
  const STEP_COUNT = 2;
  const STEP_PERSON = 3;
  const STEP_SUMMARY = 4;

  const [step, setStep] = useState(STEP_ATTENDANCE);
  const [attendance, setAttendance] = useState<"oui" | "non" | null>(null);
  const [partySize, setPartySize] = useState(1);
  const [currentPerson, setCurrentPerson] = useState(0);
  const [persons, setPersons] = useState<Person[]>([{ nom: "", prenom: "" }]);
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<{ msg: string; type: string } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const syncedPersons = useMemo(() => {
    const next = [...persons];
    while (next.length < partySize) next.push({ nom: "", prenom: "" });
    if (next.length > partySize) next.length = partySize;
    return next;
  }, [persons, partySize]);

  function setPersonField(index: number, field: keyof Person, value: string) {
    setPersons((prev) => {
      const next = [...prev];
      while (next.length < partySize) next.push({ nom: "", prenom: "" });
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function changeCount(delta: number) {
    setStatus(null);
    setPartySize((s) => Math.max(1, s + delta));
  }

  // A la sortie du champ, on impose le format international (+33..., +972...)
  // pour que l'invite voie exactement le numero qui sera utilise.
  function handlePhoneBlur() {
    const normalized = normalizePhoneE164(phone, defaultCountryForLocale(locale));
    if (normalized) setPhone(normalized);
  }

  function goNext() {
    setStatus(null);
    if (step === STEP_ATTENDANCE) {
      if (!attendance) {
        setStatus({ msg: r.errorChoice, type: "error" });
        return;
      }
      setStep(attendance === "oui" ? STEP_COUNT : STEP_SUMMARY);
    } else if (step === STEP_COUNT) {
      setCurrentPerson(0);
      setStep(STEP_PERSON);
    } else if (step === STEP_PERSON) {
      const p = syncedPersons[currentPerson];
      if (!p || !p.nom.trim() || !p.prenom.trim()) {
        setStatus({ msg: r.errorPerson, type: "error" });
        return;
      }
      if (currentPerson < partySize - 1) setCurrentPerson((i) => i + 1);
      else setStep(STEP_SUMMARY);
    }
  }

  function goPrev() {
    setStatus(null);
    if (step === STEP_SUMMARY) {
      if (attendance === "non") {
        setStep(STEP_ATTENDANCE);
      } else {
        setStep(STEP_PERSON);
        setCurrentPerson(partySize - 1);
      }
      return;
    }
    if (step === STEP_PERSON && currentPerson > 0) {
      setCurrentPerson((i) => i - 1);
      return;
    }
    if (step === STEP_PERSON) {
      setStep(STEP_COUNT);
      return;
    }
    if (step === STEP_COUNT) setStep(STEP_ATTENDANCE);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (isSending || isComplete || !attendance) return;

    const attending = attendance === "oui";
    // En cas d'absence, seule la premiere personne (le repondant) est envoyee.
    const personsToSend = attending ? syncedPersons : syncedPersons.slice(0, 1);

    const firstMissing = personsToSend.findIndex(
      (p) => !p.nom.trim() || !p.prenom.trim(),
    );
    if (firstMissing !== -1) {
      if (attending) {
        setStep(STEP_PERSON);
        setCurrentPerson(firstMissing);
      }
      setStatus({ msg: r.errorPerson, type: "error" });
      return;
    }

    // Telephone normalise en E.164 (FR par defaut sur les pages francaises,
    // IL sur les pages hebreu) — obligatoire si present, facultatif en cas d'absence.
    const normalizedPhone = normalizePhoneE164(phone, defaultCountryForLocale(locale));
    if (attending ? !normalizedPhone : phone.trim().length > 0 && !normalizedPhone) {
      setStep(STEP_SUMMARY);
      setStatus({ msg: r.errorPhone, type: "error" });
      return;
    }

    setIsSending(true);
    setStatus({ msg: r.sending, type: "loading" });
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attending,
          partySize: attending ? partySize : 0,
          persons: personsToSend.map((p) => ({
            nom: p.nom.trim(),
            prenom: p.prenom.trim(),
          })),
          phone: normalizedPhone ?? "",
          locale,
        }),
      });
      if (!res.ok) throw new Error("send");
      setIsComplete(true);
      setStep(STEP_SUMMARY);
      setStatus({ msg: r.success, type: "success" });
    } catch {
      setStatus({ msg: r.errorSend, type: "error" });
    } finally {
      setIsSending(false);
    }
  }

  const showPrev = step !== STEP_ATTENDANCE && !isComplete;
  const showNext = step !== STEP_SUMMARY && !isComplete;
  const showSubmit = step === STEP_SUMMARY && attendance !== null && !isComplete;

  /* Suite du parcours : une fois la réponse envoyée (oui ou non), on guide
     l'invité vers la réservation du week-end. */
  const showWeekendCta = showWeekend && isComplete;
  const nextRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!showWeekendCta) return;
    const id = window.setTimeout(() => {
      nextRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 250);
    return () => window.clearTimeout(id);
  }, [showWeekendCta]);

  return (
    <form id="teph-response-form" className="response-card" noValidate onSubmit={submit}>
      <h2 className="response-title">{content.responseTitle}</h2>

      <div className="response-progress" aria-label="Etapes du formulaire">
        {[1, 2, 3, 4].map((n) => (
          <span
            key={n}
            className={
              "response-progress-item" +
              (n === step ? " active" : "") +
              (n < step || isComplete ? " done" : "")
            }
          >
            {n}
          </span>
        ))}
      </div>

      <div id="response-step-content" className="response-step-content">
        {step === STEP_ATTENDANCE && (
          <div className="response-step animate-in">
            <h3>{r.attendanceQ}</h3>
            <div className="response-choice-group">
              <button
                type="button"
                className={"response-choice-button" + (attendance === "oui" ? " selected" : "")}
                aria-pressed={attendance === "oui"}
                onClick={() => {
                  setStatus(null);
                  setAttendance("oui");
                }}
              >
                {r.yes}
              </button>
              <button
                type="button"
                className={"response-choice-button" + (attendance === "non" ? " selected" : "")}
                aria-pressed={attendance === "non"}
                onClick={() => {
                  setStatus(null);
                  setAttendance("non");
                }}
              >
                {r.no}
              </button>
            </div>
          </div>
        )}

        {step === STEP_COUNT && (
          <div className="response-step animate-in">
            <h3>{r.countTitle}</h3>
            <div className="response-count-control">
              <label className="response-count-label" htmlFor="response-party-size">
                {r.countLabel}
              </label>
              <button
                type="button"
                className="response-count-button"
                aria-label={r.removeAria}
                onClick={() => changeCount(-1)}
              >
                <i className="fas fa-minus" aria-hidden="true"></i>
              </button>
              <input
                id="response-party-size"
                className="response-count-input"
                type="number"
                min={1}
                inputMode="numeric"
                value={partySize}
                onChange={(e) => setPartySize(Math.max(1, parseInt(e.target.value, 10) || 1))}
              />
              <button
                type="button"
                className="response-count-button"
                aria-label={r.addAria}
                onClick={() => changeCount(1)}
              >
                <i className="fas fa-plus" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        )}

        {step === STEP_PERSON && (
          <div className="response-step animate-in">
            <p className="response-step-note">{r.personNote(currentPerson + 1, partySize)}</p>
            <fieldset className="response-person">
              <legend>{r.participant}</legend>
              <div className="response-fields">
                <div className="response-field">
                  <label htmlFor={`person-nom-${currentPerson}`}>{r.nom}</label>
                  <input
                    id={`person-nom-${currentPerson}`}
                    type="text"
                    autoComplete="family-name"
                    required
                    value={syncedPersons[currentPerson]?.nom ?? ""}
                    onChange={(e) => setPersonField(currentPerson, "nom", e.target.value)}
                  />
                </div>
                <div className="response-field">
                  <label htmlFor={`person-prenom-${currentPerson}`}>{r.prenom}</label>
                  <input
                    id={`person-prenom-${currentPerson}`}
                    type="text"
                    autoComplete="given-name"
                    required
                    value={syncedPersons[currentPerson]?.prenom ?? ""}
                    onChange={(e) => setPersonField(currentPerson, "prenom", e.target.value)}
                  />
                </div>
              </div>
            </fieldset>
          </div>
        )}

        {step === STEP_SUMMARY && (
          <div className="response-step response-summary animate-in">
            <h3>{r.summaryTitle}</h3>
            {attendance === "non" ? (
              <>
                <p className="response-summary-count">{r.answeredNo}</p>
                {!isComplete && <p className="response-step-note">{r.noIntro}</p>}
                <div className="response-fields">
                  <div className="response-field">
                    <label htmlFor="decline-nom">{r.nom}</label>
                    <input
                      id="decline-nom"
                      type="text"
                      autoComplete="family-name"
                      required
                      value={syncedPersons[0]?.nom ?? ""}
                      onChange={(e) => setPersonField(0, "nom", e.target.value)}
                      disabled={isComplete}
                    />
                  </div>
                  <div className="response-field">
                    <label htmlFor="decline-prenom">{r.prenom}</label>
                    <input
                      id="decline-prenom"
                      type="text"
                      autoComplete="given-name"
                      required
                      value={syncedPersons[0]?.prenom ?? ""}
                      onChange={(e) => setPersonField(0, "prenom", e.target.value)}
                      disabled={isComplete}
                    />
                  </div>
                </div>
                <div className="response-field response-phone-field">
                  <label htmlFor="rsvp-phone-decline">{r.phoneLabel}</label>
                  <input
                    id="rsvp-phone-decline"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    dir="ltr"
                    placeholder={r.phonePlaceholder}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onBlur={handlePhoneBlur}
                    disabled={isComplete}
                  />
                  <p className="response-phone-hint">{r.phoneOptionalHint}</p>
                </div>
              </>
            ) : (
              <>
                <p className="response-summary-count">{r.countSummary(partySize)}</p>
                <ol className="response-summary-list">
                  {syncedPersons.map((p, i) => (
                    <li key={i}>
                      <span>{i + 1}.</span> {p.prenom} {p.nom}
                    </li>
                  ))}
                </ol>
                <div className="response-field response-phone-field">
                  <label htmlFor="rsvp-phone">{r.phoneLabel}</label>
                  <input
                    id="rsvp-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                    dir="ltr"
                    placeholder={r.phonePlaceholder}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onBlur={handlePhoneBlur}
                    disabled={isComplete}
                  />
                  <p className="response-phone-hint">{r.phoneHint}</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {status && (
        <div
          className={"response-status response-status-" + status.type}
          role="status"
          aria-live="polite"
        >
          {status.msg}
        </div>
      )}

      {showWeekendCta && (
        <div ref={nextRef} className="response-next animate-in">
          <p className="response-next-title">{r.nextTitle}</p>
          <p className="response-next-text">{r.nextText}</p>
          <a href={weekendHref} className="response-next-button">
            {r.nextCta}
          </a>
        </div>
      )}

      <div className="response-actions">
        <button
          type="button"
          className="response-button"
          onClick={goNext}
          disabled={isSending}
          hidden={!showNext}
        >
          {r.next}
        </button>
        <button
          type="submit"
          className="response-button"
          disabled={isSending}
          hidden={!showSubmit}
        >
          {isSending ? r.sending : r.submit}
        </button>
        <button
          type="button"
          className="response-button response-button-secondary"
          onClick={goPrev}
          disabled={isSending}
          hidden={!showPrev}
        >
          {r.prev}
        </button>
      </div>
    </form>
  );
}
