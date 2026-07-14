-- Journal des rappels WhatsApp envoyes (anti-doublon J-7 / J-1).

create table if not exists reminder_sends (
  id           uuid primary key default gen_random_uuid(),
  phone        text not null,
  reminder_key text not null check (reminder_key in ('global_j7', 'ceremony_j1', 'trip_j1')),
  sent_at      timestamptz not null default now(),
  unique (phone, reminder_key)
);

create index if not exists idx_reminder_sends_key on reminder_sends (reminder_key);
