-- Les scans de l'agence ne sont plus rattachés à une réservation.

alter table identity_documents
  drop constraint if exists identity_documents_booking_id_fkey;

alter table identity_documents
  alter column booking_id drop not null;
