/**
 * Charte couleur de l'événement — source unique pour PDF, e-mails et QR codes.
 * Palette taupe-or du parcours voyage (thème .theme-taupe).
 */
export const EVENT_THEME = {
  accent: "#b5a08b",
  accentHover: "#a89968",
  accentDeep: "#6b4e2f",
  cream: "#f4efe4",
  paper: "#ffffff",
  ink: "#5a5a5a",
  muted: "#6f6f6f",
  goldLight: "#e7d9b6",
  line: "#d8d1c0",
  /** Texte atténué sur fond sombre (bandeau, stub billet). */
  onDarkMuted: "#f5ecdd",
  white: "#ffffff",
} as const;

/** Alias sémantiques pour le carnet de voyage PDF. */
export const PDF_THEME = {
  navy: EVENT_THEME.accent,
  navyDeep: EVENT_THEME.accentDeep,
  gold: EVENT_THEME.accentHover,
  goldLight: EVENT_THEME.goldLight,
  ink: EVENT_THEME.ink,
  cream: EVENT_THEME.cream,
  paper: EVENT_THEME.paper,
  muted: EVENT_THEME.muted,
  line: EVENT_THEME.line,
  white: EVENT_THEME.white,
  onDarkMuted: EVENT_THEME.onDarkMuted,
} as const;
