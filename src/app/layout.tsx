import type { Metadata } from "next";
import { Fraunces, Inter_Tight, Frank_Ruhl_Libre } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/i18n/I18nProvider";
import { EVENT } from "@/lib/config";

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

export const metadata: Metadata = {
  title: `${EVENT.title} — ${EVENT.destination}`,
  description: `Inscription et réservation pour la Bar Mitsvah de ${EVENT.childName} à ${EVENT.destination}.`,
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
