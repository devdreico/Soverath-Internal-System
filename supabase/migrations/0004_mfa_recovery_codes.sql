-- Migración aditiva: códigos de recuperación MFA (hashes), un solo uso.
-- Aplicar después de 0001/0002/0003. No almacena códigos en claro.

create table if not exists private.mfa_recovery_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table private.mfa_recovery_codes enable row level security;

create policy mfa_recovery_codes_founder_select
on private.mfa_recovery_codes
for select
to authenticated
using (user_id = (select auth.uid()));

create policy mfa_recovery_codes_founder_insert
on private.mfa_recovery_codes
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy mfa_recovery_codes_founder_update
on private.mfa_recovery_codes
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
