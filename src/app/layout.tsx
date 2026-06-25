import type { Metadata, Viewport } from "next";
import { Fraunces, Inter_Tight, Frank_Ruhl_Libre } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/i18n/I18nProvider";
import { EVENT, appUrl } from "@/lib/config";

// Serif d'affichage contemporain (fort contraste, optical sizing).
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
});

// Grotesque net et moderne pour le texte / l'UI.
const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

// Serif hébraïque classique et élégant (versets, hébreu).
const frankRuhl = Frank_Ruhl_Libre({
  variable: "--font-hebrew",
  subsets: ["hebrew"],
  display: "swap",
  weight: ["400", "500", "700", "900"],
});

const SITE_TITLE = `${EVENT.title} — ${EVENT.destination}`;
const SITE_DESCRIPTION = `Inscription et réservation pour la Bar Mitsvah de ${EVENT.childName} à ${EVENT.destination}, 9–11 octobre 2026.`;

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: {
    default: SITE_TITLE,
    template: `%s · ${EVENT.title}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: EVENT.title,
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: EVENT.title,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#0a2c3d",
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
      className={`${fraunces.variable} ${interTight.variable} ${frankRuhl.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
