import type { Metadata, Viewport } from "next";
import {
  Cormorant_Garamond,
  Luxurious_Script,
  Great_Vibes,
  David_Libre,
} from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/i18n/I18nProvider";
import { appUrl } from "@/lib/config";

// Serif élégant : tout le corps de texte (faire-part, formulaires…).
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

// Script de luxe pour les grands titres (« Save The Date », « Téphilines »…).
const luxurious = Luxurious_Script({
  variable: "--font-script",
  subsets: ["latin"],
  display: "swap",
  weight: ["400"],
});

// Script calligraphique fin pour le prénom de l'invité.
const greatVibes = Great_Vibes({
  variable: "--font-vibes",
  subsets: ["latin"],
  display: "swap",
  weight: ["400"],
});

// Serif hébraïque classique (בס״ד, versets, hébreu).
const davidLibre = David_Libre({
  variable: "--font-hebrew",
  subsets: ["hebrew"],
  display: "swap",
  weight: ["400", "500", "700"],
});

// Métadonnées : titre et favicon du site d'origine (bm-shon-bechet.fr).
// La description est requise par WhatsApp pour l'aperçu GRAND format
// (titre seul => petite vignette). Voir aussi src/proxy.ts (aperçu robots).
const SITE_TITLE = "Bar Mitsvah Shon Bechet";
const SITE_DESCRIPTION =
  "C’est avec une immense joie et beaucoup d’émotion que nous partageons avec vous ce moment si précieux de notre vie. Famille Bechet";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: SITE_TITLE,
  icons: {
    icon: [{ url: "/img/logo_sans_fond.png", type: "image/png" }],
    apple: [{ url: "/img/logo_sans_fond.png" }],
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_TITLE,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/img/preview.jpg",
        secureUrl: new URL("/img/preview.jpg", appUrl()).toString(),
        width: 1200,
        height: 630,
        type: "image/jpeg",
        alt: "Invitation Bar Mitsvah Shon Bechet",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/img/preview.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#8a8a8a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      dir="ltr"
      className={`${cormorant.variable} ${luxurious.variable} ${greatVibes.variable} ${davidLibre.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Polices nommées + Font Awesome pour le clone fidèle : les CSS des
            faire-part (card2/card3) référencent les familles par leur nom
            littéral, que next/font n'expose pas. Layout racine = toutes pages. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=David+Libre:wght@400;500;700&family=Great+Vibes&family=Luxurious+Script&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
