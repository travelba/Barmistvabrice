# Bar Mitsvah Shon Bechet — Site d'inscription VIP

Site haut de gamme d'inscription et de paiement pour la Bar Mitsvah de **Shon Bechet** à **Mykonos**.
Les invités s'inscrivent, choisissent un hôtel et des chambres (selon capacité, places limitées),
renseignent les passagers du vol privé, puis règlent le total via Stripe. Chaque paiement réussi
remplit automatiquement un Google Sheet et notifie l'agence par e-mail.

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS v4**
- **Supabase** (Postgres) — hôtels, chambres, inventaire, réservations, passagers
- **Stripe Checkout** + webhook — paiement EUR (frais à la charge de l'agence)
- **Google Sheets API** — listing automatique
- **Twilio WhatsApp** — confirmations envoyées à l'invité (réservation + RSVP)
- **Resend** — e-mails de notification à l'agence
- **i18n FR / Hébreu** avec support RTL
- Déploiement **Vercel**

## Mode démo (sans configuration)

Sans variables d'environnement, l'application tourne en **mode démonstration** :
données des hôtels en mémoire, paiement simulé (aucune carte requise), Sheets/e-mails désactivés.
Idéal pour visualiser le parcours complet immédiatement.

```bash
npm install
npm run dev
# http://localhost:3000
```

Pages principales :
- `/` — invitation Téphilines (FR, version hébreu : `/teph-he`)
- `/tephilines` + `/week-end` — invitation complète Téphilines + voyage Mykonos (HE : `/tephilines-hebrew` + `/weekend-hebrew`)
- `/reservation` — tunnel d'inscription en 4 étapes (participants, hôtel, chambres, récapitulatif)
- `/confirmation` — page de confirmation après paiement (PDF, bons, boarding passes)
- `/admin` — back-office agence (mot de passe fixé dans le code : `2026`, bilingue FR/HE via `?lang=he`)

## Configuration complète (production)

Copier `.env.example` en `.env.local` et renseigner les variables.

### 1. Supabase

1. Créer un projet sur [supabase.com](https://supabase.com).
2. Dans le SQL Editor, exécuter dans l'ordre `supabase/migrations/0001_init.sql`,
   `0002_ceremony.sql`, `0003_admin_actions.sql`, puis `supabase/seed.sql`
   (ou lancer `node scripts/run-migrations.mjs` avec `DATABASE_URL` défini).
3. Renseigner `NEXT_PUBLIC_SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`.

> Remplacer ensuite les données des 2 hôtels (noms, chambres, capacités, prix, places, photos)
> dans `supabase/seed.sql` (ou directement en base) par les vraies informations du client.
> Le prix du vol et les dates se règlent dans `src/lib/config.ts`.

### 2. Stripe

1. Récupérer la clé secrète (`STRIPE_SECRET_KEY`).
2. Créer un endpoint webhook pointant vers `https://VOTRE-DOMAINE/api/stripe/webhook`,
   événement `checkout.session.completed`, et copier le secret dans `STRIPE_WEBHOOK_SECRET`.

### 3. Google Sheets

1. Créer un compte de service Google Cloud avec l'API Sheets activée.
2. Partager le classeur cible avec l'e-mail du compte de service.
3. Créer un onglet nommé `Inscriptions`.
4. Renseigner `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_ID`.

### 4. Resend (e-mails agence)

Les e-mails ne sont envoyés qu'à l'agence (nouvelle inscription / RSVP) ;
l'invité reçoit ses confirmations par WhatsApp.

1. Créer une clé API Resend et vérifier un domaine d'envoi.
2. Renseigner `RESEND_API_KEY`, `EMAIL_FROM`, `AGENCY_NOTIFY_EMAIL`.

### 5. Twilio WhatsApp (confirmations invité)

1. Créer un compte Twilio avec un expéditeur WhatsApp approuvé (`TWILIO_ACCOUNT_SID`,
   `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`).
2. Créer et faire approuver les 6 templates (BOOKING / RSVP_YES / RSVP_NO × FR/HE)
   dans le Content Template Builder, puis renseigner les `TWILIO_WA_TEMPLATE_*`
   (détail des variables dans `.env.example`). Pour le template BOOKING, inclure
   en fin de message le texte de contact conciergerie (WhatsApp + Raphael Zerdoun
   au 06 26 07 76 61) — voir suggestion dans `.env.example`.

### 6. Rappels événement (cron J-7 / J-1)

1. Appliquer la migration `supabase/migrations/0004_reminders.sql`.
2. Définir `CRON_SECRET` sur Vercel (chaîne aléatoire longue).
3. Créer et approuver 6 templates WhatsApp REMINDER_* (FR/HE × 3 types) — variables dans `.env.example`.
4. Les crons Vercel (`vercel.json`) appellent `/api/cron/reminders` à 10h et 18h (Paris).

Test à blanc : `GET /api/cron/reminders?slot=morning&dryRun=1` avec header `Authorization: Bearer <CRON_SECRET>`.

### 7. Admin

Définir `ADMIN_SECRET` si besoin d'invalider les sessions. Le mot de passe admin est fixé à `2026` dans le code.

## Déploiement Vercel

```bash
npm i -g vercel
vercel link
# Ajouter les variables d'environnement (dashboard Vercel ou `vercel env add`)
vercel --prod
```

Après le déploiement, mettre à jour `NEXT_PUBLIC_APP_URL` avec l'URL Vercel et configurer
le webhook Stripe vers `/api/stripe/webhook`.

## Architecture

```
src/
  app/
    page.tsx                 Landing
    reservation/             Tunnel d'inscription (wizard)
    confirmation/            Confirmation post-paiement
    admin/                   Back-office (login + dashboard)
    api/
      hotels/                GET hôtels + disponibilités
      checkout/              POST création paiement + holds
      stripe/webhook/        Webhook de confirmation
      admin/                 Login + export CSV
  components/                UI (landing, wizard, admin)
  lib/                       config, data, pricing, stripe, sheets, email, fulfillment
  i18n/                      Dictionnaires FR/Hébreu + provider
supabase/
  migrations/                Schéma + fonctions atomiques (0001 à 0003)
  seed.sql                   Données de démonstration
```

## Notes de sécurité

- Les montants sont **toujours recalculés côté serveur** (`computePrice`) — les prix envoyés par le
  client ne sont jamais utilisés.
- L'inventaire est protégé contre la survente par des **holds** posés à la création de la
  réservation et une fonction Postgres atomique (`reserve_booking`) avec verrouillage de ligne.
  Une réservation en attente bloque ses places jusqu'à annulation ou relance depuis le back-office.
- L'accès aux données passe par la clé `service_role` ; RLS est activé sans policy publique.
