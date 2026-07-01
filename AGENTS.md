<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

Single Next.js 16 (App Router) + TypeScript app; scripts are in `package.json` and setup is documented in `README.md`.

- **Demo mode is the default with no env vars.** With no `.env.local`, the app runs fully in demo mode: hotels come from in-memory data, Stripe payment is simulated (no card), and Supabase/Sheets/email/WhatsApp are disabled. This is enough to exercise the full reservation → confirmation flow end-to-end. Full config (Supabase, Stripe, Google Sheets, Resend, Twilio) is only needed for production integrations — see `README.md` and `.env.example`.
- **Run:** `npm run dev` (Turbopack, port 3000). Key routes: `/` (landing), `/reservation` (5-step wizard, French UI), `/confirmation`, `/admin` (password `barmitsva2026`).
- **Lint:** `npm run lint` currently reports pre-existing errors (e.g. `src/i18n/I18nProvider.tsx` set-state-in-effect) plus `<img>` warnings. These are not caused by environment setup; do not treat a non-zero lint result as a broken environment.
- **Hello-world check:** completing the `/reservation` wizard in demo mode redirects to `/confirmation?demo=1&booking_id=...` — no Stripe/card needed.
