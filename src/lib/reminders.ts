import { EVENT } from "./config";
import { listBookings, listCeremonyRsvps } from "./data";
import { wasReminderSent, markReminderSent } from "./data-reminders";
import {
  ceremonyJ1Details,
  globalJ7Details,
  tripJ1Details,
  type ReminderProfile,
} from "./reminder-copy";
import { normalizePhoneE164 } from "./phone";
import { sendReminderWhatsapp, type ReminderKind } from "./whatsapp";
import type { Booking, CeremonyRsvp, Locale } from "./types";

export type CronSlot = "morning" | "evening";

const TZ = "Europe/Paris";

function parisToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

function addDays(isoDate: string, delta: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function ceremonyDateIso(): string {
  return EVENT.tephilinesDate.slice(0, 10);
}

/** Dates d'envoi calculees depuis config (option C). */
export function reminderSchedule(): Record<ReminderKind, { date: string; slot: CronSlot }> {
  const ceremony = ceremonyDateIso();
  return {
    global_j7: { date: addDays(ceremony, -7), slot: "morning" },
    ceremony_j1: { date: addDays(ceremony, -1), slot: "evening" },
    trip_j1: { date: addDays(EVENT.tripStartDate, -1), slot: "evening" },
  };
}

function localeFromPhone(e164: string): Locale {
  return e164.startsWith("+972") ? "he" : "fr";
}

function normalizeStoredPhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return (
    normalizePhoneE164(trimmed, "33") ??
    normalizePhoneE164(trimmed, "972") ??
    (trimmed.startsWith("+") ? trimmed : null)
  );
}

function buildRecipientMap(
  bookings: Booking[],
  rsvps: CeremonyRsvp[],
): Map<string, ReminderProfile & { phone: string }> {
  const map = new Map<string, ReminderProfile & { phone: string }>();

  for (const b of bookings) {
    if (b.status !== "paid") continue;
    const phone = normalizeStoredPhone(b.phone);
    if (!phone) continue;
    map.set(phone, {
      phone,
      name: b.groupName,
      locale: localeFromPhone(phone),
      ceremonyAttending: b.ceremonyAttending,
      hasPaidTrip: true,
      booking: b,
    });
  }

  for (const r of rsvps) {
    if (!r.attending) continue;
    const phone = normalizeStoredPhone(r.phone);
    if (!phone) continue;
    const existing = map.get(phone);
    if (existing) {
      existing.ceremonyAttending = true;
      if (!existing.name.trim()) existing.name = r.name;
    } else {
      map.set(phone, {
        phone,
        name: r.name,
        locale: localeFromPhone(phone),
        ceremonyAttending: true,
        hasPaidTrip: false,
        booking: null,
      });
    }
  }

  return map;
}

function recipientsFor(kind: ReminderKind, map: Map<string, ReminderProfile & { phone: string }>) {
  switch (kind) {
    case "global_j7":
      return [...map.values()].filter((p) => p.ceremonyAttending || p.hasPaidTrip);
    case "ceremony_j1":
      return [...map.values()].filter((p) => p.ceremonyAttending);
    case "trip_j1":
      return [...map.values()].filter((p) => p.hasPaidTrip && p.booking);
  }
}

export interface ReminderRunResult {
  kind: ReminderKind;
  date: string;
  slot: CronSlot;
  sent: number;
  skipped: number;
  failed: number;
  errors: string[];
}

async function sendOne(
  kind: ReminderKind,
  profile: ReminderProfile & { phone: string },
  dryRun: boolean,
): Promise<"sent" | "skipped" | "failed"> {
  const already = await wasReminderSent(profile.phone, kind);
  if (already) return "skipped";

  if (dryRun) return "sent";

  try {
    let ok = false;
    if (kind === "global_j7") {
      ok = await sendReminderWhatsapp({
        phone: profile.phone,
        kind,
        locale: profile.locale,
        variables: {
          "1": profile.name,
          "2": EVENT.childName,
          "3": globalJ7Details(profile),
        },
      });
    } else if (kind === "ceremony_j1") {
      ok = await sendReminderWhatsapp({
        phone: profile.phone,
        kind,
        locale: profile.locale,
        variables: {
          "1": profile.name,
          "2": EVENT.childName,
          "3": ceremonyJ1Details(profile.locale),
        },
      });
    } else if (kind === "trip_j1" && profile.booking) {
      const { details, docsUrl } = tripJ1Details(profile.booking, profile.locale);
      ok = await sendReminderWhatsapp({
        phone: profile.phone,
        kind,
        locale: profile.locale,
        variables: {
          "1": profile.name,
          "2": EVENT.childName,
          "3": details,
          "4": docsUrl,
        },
      });
    }

    if (ok) {
      await markReminderSent(profile.phone, kind);
      return "sent";
    }
    return "failed";
  } catch (e) {
    console.error("[reminders] send", kind, profile.phone, e);
    return "failed";
  }
}

async function runKind(
  kind: ReminderKind,
  recipients: Array<ReminderProfile & { phone: string }>,
  dryRun: boolean,
): Promise<ReminderRunResult> {
  const schedule = reminderSchedule()[kind];
  const result: ReminderRunResult = {
    kind,
    date: schedule.date,
    slot: schedule.slot,
    sent: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  for (const profile of recipients) {
    const status = await sendOne(kind, profile, dryRun);
    if (status === "sent") result.sent++;
    else if (status === "skipped") result.skipped++;
    else result.failed++;
  }

  return result;
}

/** Declenche les rappels du creneau (morning / evening) si la date correspond. */
export async function runRemindersForSlot(
  slot: CronSlot,
  opts: { dryRun?: boolean; force?: ReminderKind } = {},
): Promise<{ today: string; results: ReminderRunResult[] }> {
  const today = parisToday();
  const schedule = reminderSchedule();
  const [bookings, rsvps] = await Promise.all([listBookings(), listCeremonyRsvps()]);
  const map = buildRecipientMap(bookings, rsvps);

  const kinds = (Object.keys(schedule) as ReminderKind[]).filter((kind) => {
    if (opts.force) return kind === opts.force;
    const s = schedule[kind];
    return s.slot === slot && s.date === today;
  });

  const results: ReminderRunResult[] = [];
  for (const kind of kinds) {
    const recipients = recipientsFor(kind, map);
    results.push(await runKind(kind, recipients, opts.dryRun ?? false));
  }

  return { today, results };
}
