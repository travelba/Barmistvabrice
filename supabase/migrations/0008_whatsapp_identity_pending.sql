-- Dernière pièce lue par numéro WhatsApp, en attente de OUI / NON.
-- RLS sans policy : seul le service_role (serveur) lit et écrit.

create table if not exists whatsapp_identity_pending (
  phone text primary key,
  message_sid text not null,
  storage_path text,
  mime_type text,
  passenger jsonb,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  constraint whatsapp_identity_pending_phone check (phone ~ '^whatsapp:\+[0-9]{8,15}$')
);

create table if not exists whatsapp_inbound_messages (
  message_sid text primary key,
  received_at timestamptz not null default now()
);

alter table whatsapp_identity_pending enable row level security;
alter table whatsapp_inbound_messages enable row level security;
