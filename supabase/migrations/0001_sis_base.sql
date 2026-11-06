-- SIS base schema. Apply after creating the Founder account in Supabase Auth.
-- The migration intentionally does not create a user or enable public sign-up.

create schema if not exists private;

create table if not exists private.founder_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  label text not null default 'Andrei / Founder',
  created_at timestamptz not null default now()
);
alter table private.founder_access enable row level security;
revoke all on private.founder_access from anon, authenticated, public;

create or replace function private.is_founder()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() is not null
    and (select auth.jwt() ->> 'aal') = 'aal2'
    and exists (
      select 1
      from private.founder_access founder
      where founder.user_id = (select auth.uid())
    );
$$;
revoke all on function private.is_founder() from public, anon;
grant execute on function private.is_founder() to authenticated;

create table if not exists public.entities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  entity_type text not null check (entity_type in ('coordinator','company','brand','service','concept','system','project','channel')),
  status text not null default 'needs_review',
  summary text not null default '',
  description text not null default '',
  parent_id uuid references public.entities(id) on delete set null,
  source_url text,
  catalog_source_url text,
  provenance text not null default 'founder_confirmed' check (provenance in ('founder_confirmed','public_observation','inferred','demo_placeholder','needs_confirmation')),
  source_observed_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.entity_relationships (
  id uuid primary key default gen_random_uuid(),
  source_entity_id uuid not null references public.entities(id) on delete cascade,
  target_entity_id uuid not null references public.entities(id) on delete cascade,
  relationship_type text not null,
  evidence text not null default '',
  source_url text,
  provenance text not null default 'needs_confirmation' check (provenance in ('founder_confirmed','public_observation','inferred','demo_placeholder','needs_confirmation')),
  created_at timestamptz not null default now(),
  unique (source_entity_id, target_entity_id, relationship_type),
  check (source_entity_id <> target_entity_id)
);

create table if not exists public.entity_documents (
  id uuid primary key default gen_random_uuid(),
  seed_key text unique,
  entity_id uuid references public.entities(id) on delete set null,
  title text not null,
  document_type text not null default 'note',
  content text not null default '',
  source_url text,
  source_observed_at date,
  provenance text not null default 'founder_confirmed' check (provenance in ('founder_confirmed','public_observation','inferred','demo_placeholder','needs_confirmation')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid references public.entities(id) on delete set null,
  title text not null,
  goal text not null default '',
  success_metric text not null default '',
  status text not null default 'planned' check (status in ('planned','active','blocked','completed','cancelled')),
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid references public.missions(id) on delete set null,
  entity_id uuid references public.entities(id) on delete set null,
  title text not null,
  summary text not null default '',
  status text not null default 'planned' check (status in ('planned','active','blocked','completed','cancelled')),
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid references public.missions(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  entity_id uuid references public.entities(id) on delete set null,
  title text not null,
  notes text not null default '',
  status text not null default 'todo' check (status in ('todo','doing','blocked','done')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.metrics (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid references public.entities(id) on delete set null,
  name text not null,
  description text not null default '',
  unit text not null default '',
  frequency text not null default 'weekly',
  target_value numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.metric_values (
  id uuid primary key default gen_random_uuid(),
  metric_id uuid not null references public.metrics(id) on delete cascade,
  value numeric not null,
  recorded_on date not null default current_date,
  note text not null default '',
  provenance text not null default 'founder_confirmed' check (provenance in ('founder_confirmed','public_observation','inferred','demo_placeholder','needs_confirmation')),
  created_at timestamptz not null default now()
);

create table if not exists public.internal_accounts (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid references public.entities(id) on delete set null,
  name text not null,
  account_type text not null default 'cash' check (account_type in ('cash','bank','digital_wallet','receivable','payable','other')),
  currency text not null default 'COP' check (currency = 'COP'),
  opening_balance_cop numeric(16,2) not null default 0,
  purpose text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.operation_events (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid references public.entities(id) on delete set null,
  account_id uuid references public.internal_accounts(id) on delete set null,
  counter_account_id uuid references public.internal_accounts(id) on delete set null,
  event_type text not null check (event_type in ('sale','purchase','expense','collection','payment','transfer','inventory','production','logistics','adjustment')),
  account_effect text not null default 'none' check (account_effect in ('increase','decrease','none')),
  title text not null,
  occurred_on date not null default current_date,
  amount_cop numeric(16,2),
  details jsonb not null default '{}'::jsonb,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (account_id is null or counter_account_id is null or account_id <> counter_account_id),
  check (amount_cop is null or amount_cop >= 0),
  check (event_type <> 'transfer' or (account_id is not null and counter_account_id is not null and amount_cop is not null and amount_cop > 0))
);

-- Balances are computed from the full event history; account rows never store a mutable balance.
create or replace view public.account_balances
with (security_invoker = true)
as
select
  account.id,
  account.opening_balance_cop + coalesce(sum(
    case
      when event.event_type = 'transfer' and event.account_id = account.id then -coalesce(event.amount_cop, 0)
      when event.event_type = 'transfer' and event.counter_account_id = account.id then coalesce(event.amount_cop, 0)
      when event.account_id = account.id and event.account_effect = 'increase' then coalesce(event.amount_cop, 0)
      when event.account_id = account.id and event.account_effect = 'decrease' then -coalesce(event.amount_cop, 0)
      else 0
    end
  ), 0) as balance_cop
from public.internal_accounts account
left join public.operation_events event
  on event.account_id = account.id or event.counter_account_id = account.id
group by account.id, account.opening_balance_cop;

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid references public.entities(id) on delete set null,
  document_id uuid references public.entity_documents(id) on delete set null,
  name text not null,
  mime_type text not null default 'application/octet-stream',
  byte_size bigint not null default 0,
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

-- Snapshots are retained for text restoration. Deletes record only lightweight metadata.
create table if not exists public.record_revisions (
  id uuid primary key default gen_random_uuid(),
  record_table text not null,
  record_id uuid not null,
  snapshot jsonb not null,
  actor_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  record_table text not null,
  record_id uuid,
  action text not null,
  label text not null default '',
  actor_id uuid,
  created_at timestamptz not null default now()
);

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function private.touch_updated_at() from public, anon, authenticated;

create or replace function private.capture_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_data jsonb;
  record_uuid uuid;
  record_label text;
begin
  if tg_op = 'DELETE' then
    row_data := to_jsonb(old);
  else
    row_data := to_jsonb(new);
  end if;

  record_uuid := nullif(row_data ->> 'id', '')::uuid;
  record_label := left(coalesce(row_data ->> 'name', row_data ->> 'title', row_data ->> 'slug', tg_table_name), 180);

  if tg_op = 'UPDATE' and tg_table_name in ('entities', 'entity_documents') then
    insert into public.record_revisions (record_table, record_id, snapshot, actor_id)
    values (tg_table_name, record_uuid, to_jsonb(old), auth.uid());
  end if;

  insert into public.audit_events (record_table, record_id, action, label, actor_id)
  values (tg_table_name, record_uuid, lower(tg_op), record_label, auth.uid());

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function private.capture_change() from public, anon, authenticated;

do $$
declare
  table_name text;
  mutable_tables text[] := array[
    'entities','entity_relationships','entity_documents','missions','projects','tasks','metrics',
    'metric_values','internal_accounts','operation_events','resources'
  ];
begin
  foreach table_name in array mutable_tables loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy founder_rw on public.%I for all to authenticated using ((select private.is_founder())) with check ((select private.is_founder()))', table_name);
    execute format('create policy require_aal2 on public.%I as restrictive for all to authenticated using ((select auth.jwt() ->> ''aal'') = ''aal2'') with check ((select auth.jwt() ->> ''aal'') = ''aal2'')', table_name);
    execute format('create trigger sis_audit_change after insert or update or delete on public.%I for each row execute function private.capture_change()', table_name);
    if table_name in ('entities','entity_documents','missions','projects','tasks','metrics','internal_accounts','operation_events') then
      execute format('create trigger sis_touch_updated_at before update on public.%I for each row execute function private.touch_updated_at()', table_name);
    end if;
  end loop;
end;
$$;

alter table public.record_revisions enable row level security;
alter table public.audit_events enable row level security;
create policy founder_read_revisions on public.record_revisions for select to authenticated using ((select private.is_founder()));
create policy founder_read_audit on public.audit_events for select to authenticated using ((select private.is_founder()));
create policy revisions_require_aal2 on public.record_revisions as restrictive for select to authenticated using ((select auth.jwt() ->> 'aal') = 'aal2');
create policy audit_requires_aal2 on public.audit_events as restrictive for select to authenticated using ((select auth.jwt() ->> 'aal') = 'aal2');

create index if not exists entities_parent_id_idx on public.entities(parent_id);
create index if not exists entity_relationships_source_idx on public.entity_relationships(source_entity_id);
create index if not exists entity_relationships_target_idx on public.entity_relationships(target_entity_id);
create index if not exists entity_documents_entity_id_idx on public.entity_documents(entity_id);
create index if not exists tasks_mission_id_idx on public.tasks(mission_id);
create index if not exists operation_events_occurred_on_idx on public.operation_events(occurred_on desc);
create index if not exists operation_events_account_idx on public.operation_events(account_id, occurred_on desc);
create index if not exists metric_values_metric_date_idx on public.metric_values(metric_id, recorded_on desc);

insert into storage.buckets (id, name, public, file_size_limit)
values ('sis-private', 'sis-private', false, 52428800)
on conflict (id) do update set public = false;

create policy founder_read_sis_files on storage.objects for select to authenticated
using (bucket_id = 'sis-private' and (select private.is_founder()) and (select auth.jwt() ->> 'aal') = 'aal2');
create policy founder_upload_sis_files on storage.objects for insert to authenticated
with check (bucket_id = 'sis-private' and (select private.is_founder()) and (select auth.jwt() ->> 'aal') = 'aal2');
create policy founder_update_sis_files on storage.objects for update to authenticated
using (bucket_id = 'sis-private' and (select private.is_founder()) and (select auth.jwt() ->> 'aal') = 'aal2')
with check (bucket_id = 'sis-private' and (select private.is_founder()) and (select auth.jwt() ->> 'aal') = 'aal2');
create policy founder_delete_sis_files on storage.objects for delete to authenticated
using (bucket_id = 'sis-private' and (select private.is_founder()) and (select auth.jwt() ->> 'aal') = 'aal2');
grant select, insert, update, delete on storage.objects to authenticated;

grant usage on schema private to authenticated;
grant select, insert, update, delete on
  public.entities, public.entity_relationships, public.entity_documents,
  public.missions, public.projects, public.tasks, public.metrics,
  public.metric_values, public.internal_accounts, public.operation_events, public.resources
to authenticated;
grant select on public.record_revisions, public.audit_events to authenticated;
grant select on public.account_balances to authenticated;

-- After the migration, add the UUID of the already-created Founder Auth user:
-- insert into private.founder_access (user_id) values ('YOUR-AUTH-USER-UUID');
