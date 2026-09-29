-- Pièces d'identité envoyées par les familles pour le manifeste de vol.
-- RLS activé sans policy : seul le service_role (serveur) lit et écrit.
-- Le bucket est privé : aucun lien public vers les scans.

create table if not exists identity_documents (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  passenger_index int,
  storage_path text not null,
  mime_type text not null,
  sex text not null check (sex in ('M', 'F')),
  last_name text not null,
  first_name text not null,
  date_of_birth date not null,
  place_of_birth text not null default '',
  doc_type text not null check (doc_type in ('PP', 'CNI')),
  doc_number text not null,
  nationality text not null,
  expiry_date date not null,
  specifications text not null default '',
  sheet_row int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint identity_documents_doc_number_unique unique (doc_number),
  constraint identity_documents_doc_number_nonempty check (length(btrim(doc_number)) > 0),
  constraint identity_documents_nationality_code check (nationality ~ '^[A-Z]{3}$')
);

create index if not exists idx_identity_documents_booking
  on identity_documents (booking_id);

alter table identity_documents enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'identity-documents',
  'identity-documents',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
