import Link from "next/link";

/**
 * Page 404 personnalisée, dans la charte « faire-part » (papier + accent).
 * Statique et bilingue (FR + HE) : pas de dépendance au provider i18n client.
 */
export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="card w-full max-w-lg rounded-2xl px-8 py-12 text-center">
        <p className="font-script text-7xl" style={{ color: "var(--accent)" }}>
          404
        </p>
        <div className="mx-auto my-6 gold-rule" />
        <h1 className="font-serif text-2xl" style={{ color: "var(--text)" }}>
          Cette page n&rsquo;existe pas
        </h1>
        <p className="mt-2 font-hebrew text-xl" dir="rtl" style={{ color: "var(--text-soft)" }}>
          הדף המבוקש לא נמצא
        </p>
        <p className="mt-6 text-sm" style={{ color: "var(--text-soft)" }}>
          Le lien est peut-être erroné ou la page a été déplacée.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="btn-gold inline-block rounded-full px-7 py-3 text-sm">
            Retour à l&rsquo;invitation
          </Link>
          <Link href="/week-end" className="btn-outline inline-block rounded-full px-7 py-3 text-sm">
            Week-end à Mykonos
          </Link>
        </div>
      </div>
    </main>
  );
}
