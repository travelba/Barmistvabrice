import { NextResponse, type NextRequest } from "next/server";
import { CANONICAL_URL } from "@/lib/config";

/**
 * Aperçus de partage (WhatsApp, Facebook, Telegram…) : les robots de
 * prévisualisation reçoivent une mini-page HTML ne contenant QUE les balises
 * Open Graph. Les visiteurs humains ne sont jamais concernés.
 *
 * Raison : le générateur d'aperçu de WhatsApp échoue par intermittence sur la
 * page complète (grande image remplacée par une vignette carrée). Une page
 * minimale garantit un aperçu grand format fiable.
 */

const BOT_UA =
  /whatsapp|facebookexternalhit|facebot|twitterbot|telegrambot|linkedinbot|slackbot|discordbot|pinterest|vkshare|snapchat/i;

const SITE_TITLE = "Bar Mitsvah Shon Bechet";
/* Description requise pour l'aperçu grand format WhatsApp (titre seul =>
   vignette). Visible uniquement dans l'aperçu de partage, pas sur le site. */
const SITE_DESCRIPTION =
  "C’est avec une immense joie et beaucoup d’émotion que nous partageons avec vous ce moment si précieux de notre vie. Famille Bechet";

export function proxy(request: NextRequest) {
  const ua = request.headers.get("user-agent") ?? "";
  if (!BOT_UA.test(ua)) return NextResponse.next();

  // URLs sur le domaine par lequel le robot arrive (bm-shon-bechet.fr ou www) :
  // le lien partagé et l'image restent sur le même hôte, sans redirection —
  // condition du grand aperçu WhatsApp. Hors production : domaine canonique.
  const origin = /bm-shon-bechet\.fr$/.test(request.nextUrl.hostname)
    ? request.nextUrl.origin
    : CANONICAL_URL;
  const pageUrl = `${origin}${request.nextUrl.pathname}`;
  const imageUrl = `${origin}/img/preview.jpg`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${SITE_TITLE}</title>
<link rel="canonical" href="${pageUrl}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE_TITLE}">
<meta property="og:title" content="${SITE_TITLE}">
<meta property="og:description" content="${SITE_DESCRIPTION}">
<meta name="description" content="${SITE_DESCRIPTION}">
<meta property="og:locale" content="fr_FR">
<meta property="og:url" content="${pageUrl}">
<meta property="og:image" content="${imageUrl}">
<meta property="og:image:secure_url" content="${imageUrl}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Invitation ${SITE_TITLE}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${SITE_TITLE}">
<meta name="twitter:description" content="${SITE_DESCRIPTION}">
<meta name="twitter:image" content="${imageUrl}">
</head>
<body>
<p><a href="${pageUrl}">${SITE_TITLE}</a></p>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}

export const config = {
  matcher: [
    "/",
    "/carte",
    "/carte-weekend",
    "/invitation",
    "/invitation-weekend",
    "/tephilines",
    "/tephilines-hebrew",
    "/teph-he",
    "/week-end",
    "/weekend-hebrew",
    "/ceremonie",
    "/voyage",
  ],
};
