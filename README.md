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
- **Resend** — e-mails de confirmation (invité + agence)
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
- `/` — page d'accueil (hero, compte à rebours, save the date)
- `/reservation` — tunnel d'inscription en 5 étapes
- `/confirmation` — page de confirmation après paiement
- `/admin` — back-office agence (mot de passe par défaut : `barmitsva2026`)

## Configuration complète (production)

Copier `.env.example` en `.env.local` et renseigner les variables.

### 1. Supabase

1. Créer un projet sur [supabase.com](https://supabase.com).
2. Dans le SQL Editor, exécuter `supabase/migrations/0001_init.sql` puis `supabase/seed.sql`.
3. Renseigner `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

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

### 4. Resend (e-mails)

1. Créer une clé API Resend et vérifier un domaine d'envoi.
2. Renseigner `RESEND_API_KEY`, `EMAIL_FROM`, `AGENCY_NOTIFY_EMAIL`.

### 5. Admin

Définir `ADMIN_PASSWORD` et `ADMIN_SECRET`.

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
  migrations/0001_init.sql   Schéma + fonctions atomiques (anti-survente)
  seed.sql                   Données de démonstration
```

## Notes de sécurité

- Les montants sont **toujours recalculés côté serveur** (`computePrice`) — les prix envoyés par le
  client ne sont jamais utilisés.
- L'inventaire est protégé contre la survente par des **holds temporaires** et une fonction Postgres
  atomique (`reserve_booking`) avec verrouillage de ligne.
- L'accès aux données passe par la clé `service_role` ; RLS est activé sans policy publique.
