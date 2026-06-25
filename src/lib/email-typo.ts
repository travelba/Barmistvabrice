/**
 * Detection de fautes de frappe courantes dans les adresses email.
 * Retourne une suggestion corrigee (ex. "x@gmail.com") ou null si rien a signaler.
 *
 * Strategie volontairement conservatrice pour eviter les faux positifs :
 *  - on ne corrige que les domaines GRAND PUBLIC connus (les domaines persos
 *    type "travelba.fr" ne sont jamais "corriges") ;
 *  - correction par distance de Levenshtein <= 2 sur le domaine complet ;
 *  - correction des TLD ".com" mal tapes (con, cmo, vom...) sur n'importe quel domaine.
 */

const POPULAR_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "hotmail.fr",
  "outlook.com",
  "outlook.fr",
  "live.fr",
  "live.com",
  "msn.com",
  "yahoo.com",
  "yahoo.fr",
  "icloud.com",
  "me.com",
  "orange.fr",
  "wanadoo.fr",
  "free.fr",
  "sfr.fr",
  "laposte.net",
  "gmx.fr",
  "gmx.com",
  "proton.me",
  "protonmail.com",
];

/** TLD mal orthographiees -> ".com". */
const TLD_FIX: Record<string, string> = {
  con: "com",
  cmo: "com",
  ocm: "com",
  comm: "com",
  coml: "com",
  cpm: "com",
  vom: "com",
  xom: "com",
  cm: "com",
  co: "com",
  om: "com",
};

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

export function suggestEmailCorrection(email: string): string | null {
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf("@");
  if (at < 1 || at === trimmed.length - 1) return null;

  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1).toLowerCase();
  if (!domain.includes(".") || domain.startsWith(".") || domain.endsWith(".")) {
    return null;
  }

  // 1) Domaine grand public exact -> rien a corriger.
  if (POPULAR_DOMAINS.includes(domain)) return null;

  // 2) Correction du TLD ".com" mal tape (sur n'importe quel domaine).
  const lastDot = domain.lastIndexOf(".");
  const base = domain.slice(0, lastDot);
  const tld = domain.slice(lastDot + 1);
  if (TLD_FIX[tld]) {
    const fixedDomain = `${base}.${TLD_FIX[tld]}`;
    if (fixedDomain !== domain) return `${local}@${fixedDomain}`;
  }

  // 3) Domaine proche d'un domaine grand public (faute de frappe).
  let best: string | null = null;
  let bestDistance = Infinity;
  for (const candidate of POPULAR_DOMAINS) {
    const d = levenshtein(domain, candidate);
    if (d < bestDistance) {
      bestDistance = d;
      best = candidate;
    }
  }
  if (best && bestDistance > 0 && bestDistance <= 2) {
    return `${local}@${best}`;
  }

  return null;
}
