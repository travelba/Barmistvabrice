const hits = new Map<string, number[]>();

/** Vrai si l'appel est encore dans le quota. 30 lectures / imports par réservation et par heure. */
export function takeIdentityRate(bookingId: string, limit = 30, windowMs = 60 * 60 * 1000): boolean {
  const now = Date.now();
  const recent = (hits.get(bookingId) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(bookingId, recent);
    return false;
  }
  recent.push(now);
  hits.set(bookingId, recent);
  return true;
}
