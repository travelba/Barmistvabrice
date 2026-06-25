interface HebrewArchProps {
  text: string;
  className?: string;
}

/**
 * Verset hébraïque dessiné en arche (dôme) via un textPath SVG.
 * Remplace l'ancienne image PNG : texte vectoriel net, à la couleur du contexte
 * (`currentColor`), dans la police hébraïque Frank Ruhl Libre.
 */
export function HebrewArch({ text, className }: HebrewArchProps) {
  // Chemin tracé de gauche à droite (glyphes non miroir) : on inverse donc
  // l'ordre des caractères et on neutralise le bidi pour obtenir une lecture
  // droite-à-gauche correcte le long de l'arche.
  const reversed = Array.from(text).reverse().join("");
  return (
    <svg
      viewBox="0 0 1000 360"
      className={className}
      role="img"
      aria-label={text}
      style={{ width: "100%", height: "auto", overflow: "visible" }}
    >
      <defs>
        {/* Dôme orienté de gauche (60) à droite (940). */}
        <path id="hebrew-arch" d="M 60 350 A 470 470 0 0 1 940 350" fill="none" />
      </defs>
      <text
        textAnchor="middle"
        fill="currentColor"
        style={{
          fontFamily: "var(--font-hebrew), serif",
          fontSize: 64,
          fontWeight: 500,
          letterSpacing: "1px",
          direction: "ltr",
          unicodeBidi: "bidi-override",
        }}
      >
        <textPath href="#hebrew-arch" startOffset="50%">
          {reversed}
        </textPath>
      </text>
    </svg>
  );
}
