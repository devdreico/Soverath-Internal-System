-- Migración aditiva: ideas de sistemas futuros (recopilación y planeación).
-- Aplicar después de 0001-0005.

create table if not exists public.system_ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  idea_type text not null default 'system' check (idea_type in ('system','feature','integration','process','research')),
  status text not null default 'inbox' check (status in ('inbox','evaluating','planned','in_progress','completed','discarded')),
  entity_id uuid references public.entities(id) on delete set null,
  impact smallint not null default 3 check (impact between 1 and 5),
  effort smallint not null default 3 check (effort between 1 and 5),
  dependencies jsonb not null default '[]'::jsonb,
  risks text,
  provenance text not null default 'founder_confirmed',
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.system_ideas enable row level security;

create policy system_ideas_founder_all on public.system_ideas
for all to authenticated
using ((select private.is_founder()))
with check ((select private.is_founder()));

create policy system_ideas_require_aal2 on public.system_ideas
as restrictive for all to authenticated
using ((select auth.jwt() ->> 'aal') = 'aal2')
with check ((select auth.jwt() ->> 'aal') = 'aal2');

create trigger system_ideas_touch_updated_at
before update on public.system_ideas
for each row execute function private.touch_updated_at();
