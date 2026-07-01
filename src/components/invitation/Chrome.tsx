"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Pause, Play } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

/**
 * Écran d'accueil « Voir l'invitation » : logo animé + nom + bouton.
 * Bloque le scroll tant qu'il n'est pas fermé (comme le site d'origine).
 */
/** Évènement émis quand l'invitation est ouverte (déclenche la musique). */
export const INVITATION_OPEN_EVENT = "inv:open";

export function WelcomeOverlay({ logo = "/img/logo_shine_sans_fond.png" }: { logo?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function reveal() {
    // Émis dans le même call stack que le clic : la lecture audio profite
    // ainsi de l'« activation utilisateur » et n'est pas bloquée par le navigateur.
    window.dispatchEvent(new Event(INVITATION_OPEN_EVENT));
    setOpen(false);
  }

  return (
    <div className={`inv-overlay${open ? "" : " is-hidden"}`} aria-hidden={!open}>
      <div className="inv-overlay-content">
        <Image
          src={logo}
          alt="Bar Mitsvah Shon Bechet"
          width={520}
          height={520}
          priority
          className="inv-overlay-logo"
          style={{ width: "min(520px, 80vw)", height: "auto" }}
        />
        <p className="inv-overlay-subtitle">
          {t("overlay.barmitsvah")}
          <span className="inv-overlay-name">{t("overlay.name")}</span>
        </p>
        <button type="button" className="inv-overlay-button" onClick={reveal}>
          {t("overlay.cta")}
        </button>
      </div>
    </div>
  );
}

/** Bouton de musique d'ambiance (lecture/pause). */
export function MusicToggle({ src }: { src: string }) {
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLAudioElement | null>(null);

  function play() {
    const el = ref.current;
    if (!el) return;
    el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }

  function toggle() {
    const el = ref.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      play();
    }
  }

  // Lance la musique dès l'ouverture de l'invitation (clic « Voir l'invitation »).
  useEffect(() => {
    const onOpen = () => play();
    window.addEventListener(INVITATION_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(INVITATION_OPEN_EVENT, onOpen);
  }, []);

  return (
    <>
      <audio ref={ref} src={src} loop preload="auto" />
      <button
        type="button"
        className="inv-music"
        onClick={toggle}
        aria-label="Musique"
        aria-pressed={playing}
      >
        {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
      </button>
    </>
  );
}

/** Sélecteur de langue avec drapeau (FR ⇄ HE). */
export function LanguageFlag() {
  const { locale, toggleLocale } = useI18n();
  // En FR on propose de passer en hébreu (drapeau israélien) et inversement.
  const flag = locale === "fr" ? "/img/flag-israel.svg" : "/img/flag-france.svg";
  const label = locale === "fr" ? "עברית" : "Français";
  return (
    <button type="button" className="inv-lang" onClick={toggleLocale} aria-label={label} title={label}>
      <Image src={flag} alt={label} width={52} height={52} />
    </button>
  );
}

type NavItem = { label: string; href: string };

/** Barre de navigation fixe (ancres + lien inter-pages). */
export function InvitationNav({ items }: { items: NavItem[] }) {
  return (
    <nav className="inv-navbar">
      <div className="inv-navbar-content">
        {items.map((it) => (
          <a key={it.href} href={it.href} className="inv-nav-link">
            {it.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
