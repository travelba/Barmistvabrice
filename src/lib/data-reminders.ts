import { isSupabaseConfigured } from "./config";
import { getSupabaseAdmin } from "./supabase/admin";
import type { ReminderKind } from "./whatsapp";

const g = globalThis as unknown as { __bmsbReminderSent?: Set<string> };

function demoSet(): Set<string> {
  if (!g.__bmsbReminderSent) g.__bmsbReminderSent = new Set();
  return g.__bmsbReminderSent;
}

function demoKey(phone: string, key: ReminderKind): string {
  return `${phone}:${key}`;
}

export async function wasReminderSent(phone: string, key: ReminderKind): Promise<boolean> {
  if (!isSupabaseConfigured) {
    return demoSet().has(demoKey(phone, key));
  }
  const sb = getSupabaseAdmin()!;
  const { data, error } = await sb
    .from("reminder_sends")
    .select("id")
    .eq("phone", phone)
    .eq("reminder_key", key)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function markReminderSent(phone: string, key: ReminderKind): Promise<void> {
  if (!isSupabaseConfigured) {
    demoSet().add(demoKey(phone, key));
    return;
  }
  const sb = getSupabaseAdmin()!;
  const { error } = await sb.from("reminder_sends").insert({ phone, reminder_key: key });
  if (error && error.code !== "23505") throw error;
}
